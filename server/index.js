/* eslint-env node */
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { getSuggestions, trackSummoner, supabase } from './db.js';

const app = express();
const port = Number(process.env.PORT) || 5174;
const riotApiKey = process.env.RIOT_API_KEY;

if (!riotApiKey) {
  throw new Error('Missing RIOT_API_KEY in environment');
}

const HOST = process.env.BIND_ADDRESS || '127.0.0.1';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Token Verification Middleware
const verifyToken = async (req, res, next) => {
  const requestPath = req.originalUrl.split('?')[0];
  if (requestPath.startsWith('/api/summoners/')) return next();
  if (requestPath === '/api/health') return next();
  if (requestPath.startsWith('/api/riot/')) return next();
  
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`Auth failed: Missing or invalid Authorization header from ${req.ip}`);
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  
  try {
    // Verify the JWT signature locally using jsonwebtoken.
    // If your project uses the newer RS256 (asymmetric) keys, you will fetch the JWKS.
    // By default, most Supabase projects use HS256 symmetric keys via SUPABASE_JWT_SECRET.
    const secret = process.env.SUPABASE_JWT_SECRET;
    
    if (!secret) {
      throw new Error('Missing SUPABASE_JWT_SECRET environment variable for local token verification.');
    }

    const decoded = jwt.verify(token, secret);
    
    // The user identity is inside the decoded JWT payload
    req.user = decoded;
    next();
  } catch (err) {
    console.warn(`Auth failed: Invalid token from ${req.ip} - ${err.message}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

// Require authentication for all API routes (except health)
app.use('/api/', verifyToken);

const normalize = (value) => String(value || '').trim().toLowerCase();

const levenshtein = (a, b) => {
  const aLen = a.length;
  const bLen = b.length;
  if (aLen === 0) return bLen;
  if (bLen === 0) return aLen;
  const matrix = Array.from({ length: bLen + 1 }, (_, i) => [i]);
  for (let j = 0; j <= aLen; j += 1) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= bLen; i += 1) {
    for (let j = 1; j <= aLen; j += 1) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[bLen][aLen];
};

const getRiotBaseUrl = (proxyPath) => {
  if (proxyPath.startsWith('/riot/account/v1/') || proxyPath.startsWith('/lol/match/v5/')) {
    return 'https://europe.api.riotgames.com';
  }
  return 'https://tr1.api.riotgames.com';
};

const stripRiotPrefix = (path) => {
  const stripped = path.replace(/^\/api\/riot/, '');
  if (stripped.startsWith('/account/')) {
    return '/riot' + stripped;
  }
  return stripped;
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/summoners/suggest', async (req, res) => {
  const rawQuery = typeof req.query.query === 'string' ? req.query.query : '';
  const query = normalize(rawQuery);
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 6, 20);

  if (!query) {
    res.json([]);
    return;
  }

  try {
    const candidates = await getSuggestions(query);

    const scored = candidates.map((row) => {
      const nameMatch = row.game_name_norm.startsWith(query) || row.tag_line_norm.startsWith(query);
      const containsMatch = row.game_name_norm.includes(query) || row.tag_line_norm.includes(query);
      const combined = `${row.game_name_norm}#${row.tag_line_norm}`;
      const distance = levenshtein(combined, query);
      return {
        gameName: row.game_name,
        tagLine: row.tag_line,
        profileIconId: row.profile_icon_id,
        summonerLevel: row.summoner_level,
        score: nameMatch ? 0 : (containsMatch ? 1 : 2),
        distance,
        searchCount: row.search_count,
        lastSeen: row.last_seen,
      };
    });

    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (a.distance !== b.distance) return a.distance - b.distance;
      if (a.searchCount !== b.searchCount) return b.searchCount - a.searchCount;
      return b.lastSeen - a.lastSeen;
    });

    res.json(scored.slice(0, limit).map(({ gameName, tagLine, profileIconId, summonerLevel }) => ({ gameName, tagLine, profileIconId, summonerLevel })));
  } catch (err) {
    console.error('GET /api/summoners/suggest error:', err);
    res.status(500).json({ error: 'Failed to load suggestions.', detail: err && err.message ? err.message : String(err) });
  }
});

app.post('/api/summoners/track', async (req, res) => {
  const { gameName, tagLine, profileIconId, summonerLevel } = req.body || {};
  if (typeof gameName !== 'string' || typeof tagLine !== 'string') {
    res.status(400).json({ error: 'Invalid payload.' });
    return;
  }

  const name = gameName.trim();
  const tag = tagLine.trim();
  if (!name || !tag) {
    res.status(400).json({ error: 'Missing summoner name or tag.' });
    return;
  }

  const nameNorm = normalize(name);
  const tagNorm = normalize(tag);
  const now = Date.now();

  try {
    await trackSummoner({
      gameName: name,
      tagLine: tag,
      profileIconId: typeof profileIconId === 'number' ? profileIconId : null,
      summonerLevel: typeof summonerLevel === 'number' ? summonerLevel : null,
      gameNameNorm: nameNorm,
      tagLineNorm: tagNorm,
      now,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/summoners/track error:', err);
    res.status(500).json({ error: 'Failed to track summoner.', detail: err && err.message ? err.message : String(err) });
  }
});

app.all('/api/riot/*', async (req, res) => {
  try {
    const riotPath = stripRiotPrefix(req.originalUrl);
    const baseUrl = getRiotBaseUrl(riotPath);
    const separator = riotPath.includes('?') ? '&' : '?';
    const url = `${baseUrl}${riotPath}${separator}api_key=${riotApiKey}`;
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Accept': 'application/json',
      },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body),
    });

    const contentType = response.headers.get('content-type') || '';
    res.status(response.status);
    if (contentType.includes('application/json')) {
      const json = await response.json();
      res.json(json);
    } else {
      const text = await response.text();
      res.type(contentType || 'text/plain').send(text);
    }
  } catch (err) {
    console.error('ALL /api/riot/* proxy error:', err);
    res.status(500).json({ error: 'Failed to proxy Riot request.', detail: err && err.message ? err.message : String(err) });
  }
});

app.post('/api/summoners/backfill-icons', async (_req, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('summoner_suggestions')
      .select('id, game_name, tag_line')
      .is('profile_icon_id', null);

    if (error) throw error;
    if (!rows || rows.length === 0) {
      res.json({ ok: true, updated: 0, message: 'No rows need backfill.' });
      return;
    }

    let updated = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        const accountRes = await fetch(
          `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(row.game_name)}/${encodeURIComponent(row.tag_line)}?api_key=${riotApiKey}`
        );
        if (!accountRes.ok) { failed++; continue; }
        const account = await accountRes.json();
        if (!account.puuid) { failed++; continue; }

        const summonerRes = await fetch(
          `https://tr1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}?api_key=${riotApiKey}`
        );
        if (!summonerRes.ok) { failed++; continue; }
        const summoner = await summonerRes.json();
        if (typeof summoner.profileIconId !== 'number') { failed++; continue; }

        const { error: updateError } = await supabase
          .from('summoner_suggestions')
          .update({ profile_icon_id: summoner.profileIconId, summoner_level: summoner.summonerLevel })
          .eq('id', row.id);

        if (updateError) { failed++; continue; }
        updated++;
      } catch {
        failed++;
      }
    }

    res.json({ ok: true, updated, failed, total: rows.length });
  } catch (err) {
    console.error('Backfill error:', err);
    res.status(500).json({ error: 'Backfill failed.', detail: err && err.message ? err.message : String(err) });
  }
});

app.listen(port, HOST, () => {
  console.log(`Suggestion API running on http://${HOST}:${port}`);
});
