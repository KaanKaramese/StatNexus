/* eslint-env node */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment. Check your .env file.'
  );
}

// Since you do not intend to use the legacy service_role key, we will construct the client
// dynamically using the user's JWT from the request, or gracefully handle anon usage.
// However, note that if we act as Anon, the DB RLS policies might block us unless relaxed.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const getSuggestions = async (query) => {
  const normalizedQuery = query.trim().toLowerCase();
  try {
    const { data, error } = await supabase
      .from('summoner_suggestions')
      .select(
        'game_name,tag_line,profile_icon_id,summoner_level,game_name_norm,tag_line_norm,search_count,last_seen'
      )
      .or(
        `game_name_norm.ilike.%${normalizedQuery}%,tag_line_norm.ilike.%${normalizedQuery}%`
      )
      .order('search_count', { ascending: false })
      .order('last_seen', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Supabase getSuggestions error:', { normalizedQuery, error });
      throw error;
    }
    return data || [];
  } catch (err) {
    console.error('getSuggestions unexpected error:', { normalizedQuery, err });
    throw err;
  }
};

export const trackSummoner = async ({ gameName, tagLine, profileIconId, summonerLevel, gameNameNorm, tagLineNorm, now }) => {
  try {
    // Instead of querying and bypassing RLS with a service_role key, 
    // we use our secure RPC function that runs as SECURITY DEFINER.
    const { error: rpcError } = await supabase.rpc('track_summoner_suggestion', {
      p_game_name: gameName,
      p_tag_line: tagLine,
      p_game_name_norm: gameNameNorm,
      p_tag_line_norm: tagLineNorm,
      p_profile_icon_id: profileIconId,
      p_summoner_level: summonerLevel,
      p_now: now
    });

    if (rpcError) {
      console.error('Supabase RPC error in trackSummoner:', { gameNameNorm, tagLineNorm, rpcError });
      throw rpcError;
    }
  } catch (err) {
    console.error('trackSummoner unexpected error:', { gameNameNorm, tagLineNorm, err });
    throw err;
  }
};
