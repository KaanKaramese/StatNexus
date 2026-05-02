import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SignJWT, jwtVerify } from 'https://esm.sh/jose@5.9.6'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET') ?? ''
const RIOT_API_KEY = Deno.env.get('RIOT_API_KEY') ?? ''
const RIOT_CLIENT_ID = Deno.env.get('RIOT_CLIENT_ID') ?? ''
const RIOT_CLIENT_SECRET = Deno.env.get('RIOT_CLIENT_SECRET') ?? ''
const RIOT_REDIRECT_URI = Deno.env.get('RIOT_REDIRECT_URI') ?? ''
const CORS_ORIGIN = Deno.env.get('CORS_ORIGIN') ?? '*'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
  'Access-Control-Max-Age': '86400',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(msg: string, status = 400) {
  return json({ error: msg }, status)
}

async function createAppToken(payload: Record<string, unknown>) {
  const secret = new TextEncoder().encode(JWT_SECRET)
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret)
}

async function verifyBearerToken(token: string) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured')
  const secret = new TextEncoder().encode(JWT_SECRET)
  const { payload } = await jwtVerify(token, secret)
  return payload
}

function normalize(value: string) {
  return (value ?? '').trim().toLowerCase()
}

function levenshtein(a: string, b: string) {
  const aLen = a.length
  const bLen = b.length
  if (aLen === 0) return bLen
  if (bLen === 0) return aLen
  const matrix: number[][] = Array.from({ length: bLen + 1 }, (_, i) => [i])
  for (let j = 0; j <= aLen; j++) matrix[0][j] = j
  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }
  return matrix[bLen][aLen]
}

function getRiotBaseUrl(proxyPath: string, region?: string) {
  if (
    proxyPath.startsWith('/riot/account/v1/') ||
    proxyPath.startsWith('/lol/match/v5/')
  ) {
    return 'https://europe.api.riotgames.com'
  }
  const shard = region || 'tr1'
  return `https://${shard}.api.riotgames.com`
}

function stripRiotPrefix(path: string) {
  const stripped = path.replace(/^\/riot\//, '')
  if (stripped.startsWith('account/')) {
    return '/riot/' + stripped
  }
  return '/' + stripped
}

async function handleHealth() {
  return json({ ok: true })
}

async function handleAuthLogin() {
  if (!RIOT_CLIENT_ID || RIOT_CLIENT_ID === 'your_riot_client_id_here') {
    return errorResponse('Riot OAuth not configured', 500)
  }
  const state = crypto.randomUUID()
  const params = new URLSearchParams({
    client_id: RIOT_CLIENT_ID,
    redirect_uri: RIOT_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid',
    state,
  })
  const url = `https://auth.riotgames.com/authorize?${params.toString()}`
  return json({ url, state })
}

async function handleAuthCallback(url: URL) {
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code) return errorResponse('Missing authorization code')
  if (!state) return errorResponse('Missing state parameter')

  try {
    const basicAuth = btoa(`${RIOT_CLIENT_ID}:${RIOT_CLIENT_SECRET}`)
    const tokenResponse = await fetch('https://auth.riotgames.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: RIOT_REDIRECT_URI,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text()
      console.error('Token exchange failed:', tokenResponse.status, errText)
      return errorResponse('Failed to exchange authorization code', 401)
    }

    const tokens = await tokenResponse.json()
    const { access_token } = tokens
    if (!access_token) return errorResponse('No access token received', 401)

    const userResponse = await fetch('https://auth.riotgames.com/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })

    if (!userResponse.ok) {
      return errorResponse('Failed to fetch user info', 401)
    }

    const userInfo = await userResponse.json()
    const puuid = userInfo.sub
    if (!puuid) return errorResponse('No PUUID in userinfo', 400)

    let gameName = userInfo.name || ''
    let tagLine = ''

    if (gameName.includes('#')) {
      const parts = gameName.split('#')
      gameName = parts[0]
      tagLine = parts.slice(1).join('#')
    }

    if (RIOT_API_KEY) {
      try {
        const accountRes = await fetch(
          `https://europe.api.riotgames.com/riot/account/v1/accounts/by-puuid/${puuid}?api_key=${RIOT_API_KEY}`,
        )
        if (accountRes.ok) {
          const account = await accountRes.json()
          gameName = account.gameName || gameName
          tagLine = account.tagLine || tagLine
        }
      } catch {
        // non-critical
      }
    }

    const { error: upsertError } = await supabase.rpc('upsert_riot_user', {
      p_puuid: puuid,
      p_game_name: gameName,
      p_tag_line: tagLine,
    })
    if (upsertError) {
      console.error('Supabase upsert error:', upsertError)
    }

    const appToken = await createAppToken({
      sub: puuid,
      game_name: gameName,
      tag_line: tagLine,
    })

    return json({ token: appToken, user: { puuid, gameName, tagLine } })
  } catch (err) {
    console.error('auth callback error:', err)
    return errorResponse('Authentication failed', 500)
  }
}

async function handleAuthMe(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse('Missing authorization header', 401)
  }

  const token = authHeader.split(' ')[1]
  try {
    const payload = await verifyBearerToken(token)
    return json({
      user: {
        puuid: payload.sub,
        gameName: payload.game_name,
        tagLine: payload.tag_line,
      },
    })
  } catch {
    return errorResponse('Invalid or expired token', 401)
  }
}

function handleAuthLogout() {
  return json({ ok: true })
}

async function handleSuggest(url: URL) {
  const rawQuery = url.searchParams.get('query') || ''
  const query = normalize(rawQuery)
  const limit = Math.min(Number(url.searchParams.get('limit')) || 6, 20)

  if (!query) return json([])

  try {
    const { data, error } = await supabase
      .from('summoner_suggestions')
      .select(
        'game_name,tag_line,profile_icon_id,summoner_level,region,game_name_norm,tag_line_norm,search_count,last_seen',
      )
      .or(
        `game_name_norm.ilike.%${query}%,tag_line_norm.ilike.%${query}%`,
      )
      .order('search_count', { ascending: false })
      .order('last_seen', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Supabase suggest error:', error)
      return errorResponse('Failed to load suggestions', 500)
    }

    const candidates = data || []

    const scored = candidates.map(
      (row: Record<string, unknown>) => {
        const nameMatch =
          (row.game_name_norm as string)?.startsWith(query) ||
          (row.tag_line_norm as string)?.startsWith(query)
        const containsMatch =
          (row.game_name_norm as string)?.includes(query) ||
          (row.tag_line_norm as string)?.includes(query)
        const combined =
          `${row.game_name_norm as string}#${row.tag_line_norm as string}`
        const distance = levenshtein(combined, query)
        return {
          gameName: row.game_name as string,
          tagLine: row.tag_line as string,
          profileIconId: row.profile_icon_id as number | null,
          summonerLevel: row.summoner_level as number | null,
          region: row.region as string,
          score: nameMatch ? 0 : containsMatch ? 1 : 2,
          distance,
          searchCount: row.search_count as number,
          lastSeen: row.last_seen as number,
        }
      },
    )

    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score
      if (a.distance !== b.distance) return a.distance - b.distance
      if (a.searchCount !== b.searchCount) return b.searchCount - a.searchCount
      return b.lastSeen - a.lastSeen
    })

    const results = scored.slice(0, limit).map(
      ({ gameName, tagLine, profileIconId, summonerLevel, region }) => ({
        gameName,
        tagLine,
        profileIconId,
        summonerLevel,
        region,
      }),
    )

    return json(results)
  } catch (err) {
    console.error('Suggest error:', err)
    return errorResponse('Failed to load suggestions', 500)
  }
}

async function handleTrack(req: Request) {
  try {
    const body = await req.json()
    const { gameName, tagLine, profileIconId, summonerLevel, region } = body

    if (typeof gameName !== 'string' || typeof tagLine !== 'string') {
      return errorResponse('Invalid payload')
    }

    const name = gameName.trim()
    const tag = tagLine.trim()
    if (!name || !tag) return errorResponse('Missing summoner name or tag')

    const { error: rpcError } = await supabase.rpc(
      'track_summoner_suggestion',
      {
        p_game_name: name,
        p_tag_line: tag,
        p_profile_icon_id:
          typeof profileIconId === 'number' ? profileIconId : null,
        p_summoner_level:
          typeof summonerLevel === 'number' ? summonerLevel : null,
        p_region: region || 'tr',
        p_game_name_norm: normalize(name),
        p_tag_line_norm: normalize(tag),
        p_now: Date.now(),
      },
    )

    if (rpcError) {
      console.error('Track RPC error:', rpcError)
      return errorResponse('Failed to track summoner', 500)
    }

    return json({ ok: true })
  } catch (err) {
    console.error('Track error:', err)
    return errorResponse('Failed to track summoner', 500)
  }
}

async function handleRiotProxy(req: Request, requestPath: string) {
  try {
    const reqUrl = new URL(req.url)
    const riotPath = stripRiotPrefix(requestPath)
    const region = reqUrl.searchParams.get('region') || undefined
    const baseUrl = getRiotBaseUrl(riotPath, region)
    reqUrl.searchParams.delete('region')
    const remainingParams = reqUrl.searchParams.toString()
    let finalPath = riotPath
    if (remainingParams) {
      finalPath += '?' + remainingParams
    }
    const separator = finalPath.includes('?') ? '&' : '?'
    const url = `${baseUrl}${finalPath}${separator}api_key=${encodeURIComponent(RIOT_API_KEY)}`

    const body =
      req.method === 'GET' || req.method === 'HEAD'
        ? undefined
        : await req.text()

    const response = await fetch(url, {
      method: req.method,
      headers: { Accept: 'application/json' },
      body,
    })

    const contentType = response.headers.get('content-type') || ''
    const responseBody = contentType.includes('application/json')
      ? JSON.stringify(await response.json())
      : await response.text()

    return new Response(responseBody, {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType || 'text/plain',
      },
    })
  } catch (err) {
    console.error('Riot proxy error:', err)
    return errorResponse('Failed to proxy Riot request', 500)
  }
}

async function handleBackfillIcons() {
  try {
    const { data: rows, error } = await supabase
      .from('summoner_suggestions')
      .select('id, game_name, tag_line')
      .is('profile_icon_id', null)

    if (error) throw error
    if (!rows || rows.length === 0) {
      return json({
        ok: true,
        updated: 0,
        message: 'No rows need backfill.',
      })
    }

    let updated = 0
    let failed = 0
    for (const row of rows) {
      try {
        const accountRes = await fetch(
          `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(row.game_name)}/${encodeURIComponent(row.tag_line)}?api_key=${RIOT_API_KEY}`,
        )
        if (!accountRes.ok) {
          failed++
          continue
        }
        const account = await accountRes.json()
        if (!account.puuid) {
          failed++
          continue
        }

        let shard = 'tr1'
        try {
          const shardRes = await fetch(
            `https://europe.api.riotgames.com/riot/account/v1/active-shards/by-game/lol/by-puuid/${account.puuid}?api_key=${RIOT_API_KEY}`,
          )
          if (shardRes.ok) {
            const shardData = await shardRes.json()
            if (shardData.activeShard) shard = shardData.activeShard
          }
        } catch {}

        const summonerRes = await fetch(
          `https://${shard}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${account.puuid}?api_key=${RIOT_API_KEY}`,
        )
        if (!summonerRes.ok) {
          failed++
          continue
        }
        const summoner = await summonerRes.json()
        if (typeof summoner.profileIconId !== 'number') {
          failed++
          continue
        }

        const { error: updateError } = await supabase
          .from('summoner_suggestions')
          .update({
            profile_icon_id: summoner.profileIconId,
            summoner_level: summoner.summonerLevel,
          })
          .eq('id', row.id)

        if (updateError) {
          failed++
          continue
        }
        updated++
      } catch {
        failed++
      }
    }

    return json({ ok: true, updated, failed, total: rows.length })
  } catch (err) {
    console.error('Backfill error:', err)
    return errorResponse('Backfill failed', 500)
  }
}

function extractPath(reqUrl: URL) {
  let path = reqUrl.pathname
  // Supabase may strip /functions/v1/api → keep /api prefix
  // or the path may include the full prefix
  const prefixes = ['/functions/v1/api/api', '/functions/v1/api', '/api']
  for (const prefix of prefixes) {
    if (path.startsWith(prefix)) {
      path = path.slice(prefix.length) || '/'
      break
    }
  }
  // Ensure leading slash
  if (!path.startsWith('/')) path = '/' + path
  return path
}

function matchPath(path: string, route: string) {
  return path === route || path === '/api' + route
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = extractPath(url)

  try {
    if (matchPath(path, '/health')) return await handleHealth()

    if (matchPath(path, '/auth/riot/login')) return await handleAuthLogin()
    if (matchPath(path, '/auth/riot/callback')) return await handleAuthCallback(url)
    if (matchPath(path, '/auth/me')) return await handleAuthMe(req)
    if (matchPath(path, '/auth/logout')) return handleAuthLogout()

    if (matchPath(path, '/summoners/suggest')) return await handleSuggest(url)
    if (matchPath(path, '/summoners/track')) return await handleTrack(req)

    if (matchPath(path, '/summoners/backfill-icons')) {
      const authHeader = req.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return errorResponse('Unauthorized', 401)
      }
      try {
        await verifyBearerToken(authHeader.split(' ')[1])
      } catch {
        return errorResponse('Unauthorized', 401)
      }
      return await handleBackfillIcons()
    }

    if (path.startsWith('/riot/') || path.startsWith('/api/riot/')) {
      const riotPath = path.startsWith('/api/riot/') ? path.slice(4) : path
      return await handleRiotProxy(req, riotPath)
    }

    return errorResponse(`Not found: ${path}`, 404)
  } catch (err) {
    console.error('Unhandled error:', err)
    return errorResponse('Internal server error', 500)
  }
})
