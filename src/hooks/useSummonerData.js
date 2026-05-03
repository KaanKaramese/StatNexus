import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api';

function buildProfileData(accountData, summonerData, leagueEntry) {
  const rankText = leagueEntry
    ? `${leagueEntry.tier} ${leagueEntry.rank} (${leagueEntry.leaguePoints} LP)`
    : '-';
  return {
    name: accountData.gameName && accountData.tagLine
      ? `${accountData.gameName}#${accountData.tagLine}`
      : (summonerData.name || '-'),
    level: summonerData.summonerLevel,
    icon: summonerData.profileIconId != null ? `${summonerData.profileIconId}` : '',
    rank: rankText,
    wins: leagueEntry?.wins || 0,
    losses: leagueEntry?.losses || 0,
    tier: leagueEntry?.tier || null,
    rankDivision: leagueEntry?.rank || null,
    lp: leagueEntry?.leaguePoints || null,
    puuid: accountData.puuid,
    encryptedSummonerId: summonerData.id,
  };
}

export function useSummonerData(gameName, tagLine, { onSuccess } = {}) {
  const [profile, setProfile] = useState(null);
  const [puuid, setPuuid] = useState(null);
  const [isLoading, setIsLoading] = useState(!!(gameName && tagLine));
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  useEffect(() => {
    if (!gameName || !tagLine) {
      setProfile(null);
      setPuuid(null);
      setIsLoading(false);
      setError('');
      return;
    }

    const requestId = ++requestIdRef.current;
    setProfile(null);
    setPuuid(null);
    setError('');
    setIsLoading(true);

    const fetchData = async () => {
      try {
        const response = await apiFetch(
          `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
        );
        if (requestIdRef.current !== requestId) return;

        if (!response.ok) {
          setError(
            response.status === 404
              ? 'Summoner not found. Please check the name and tag.'
              : response.status === 403
              ? 'API key invalid or expired. Please update your API key.'
              : 'Failed to fetch summoner info. Try again later.'
          );
          setIsLoading(false);
          return;
        }

        const accountData = await response.json();
        if (!accountData.puuid) {
          setError('Invalid summoner data received.');
          setIsLoading(false);
          return;
        }

        let region = 'tr1';
        try {
          const shardRes = await apiFetch(
            `/riot/account/v1/active-shards/by-game/lol/by-puuid/${accountData.puuid}`
          );
          if (shardRes.ok) {
            const shardData = await shardRes.json();
            if (shardData.activeShard) region = shardData.activeShard;
          }
        } catch {
          // shard fetch is optional, proceed with default region
        }
        if (requestIdRef.current !== requestId) return;

        const summonerRes = await apiFetch(
          `/riot/lol/summoner/v4/summoners/by-puuid/${accountData.puuid}?region=${region}`
        );
        if (requestIdRef.current !== requestId) return;

        if (!summonerRes.ok) {
          setError('Failed to fetch summoner profile info.');
          setIsLoading(false);
          return;
        }

        const summonerData = await summonerRes.json();

        const rankRes = await apiFetch(
          `/riot/lol/league/v4/entries/by-puuid/${accountData.puuid}?region=${region}`
        );
        if (requestIdRef.current !== requestId) return;

        let entry = null;
        if (rankRes.ok) {
          const rankData = await rankRes.json();
          if (Array.isArray(rankData) && rankData.length > 0) {
            const solo = rankData.find(q => q.queueType === 'RANKED_SOLO_5x5');
            entry = solo || rankData[0];
          }
        }

        const profileData = buildProfileData(accountData, summonerData, entry);
        setProfile(profileData);
        setPuuid(accountData.puuid);
        setIsLoading(false);

        if (onSuccessRef.current) {
          onSuccessRef.current({
            gameName: accountData.gameName,
            tagLine: accountData.tagLine,
            profileIconId: summonerData.profileIconId,
            summonerLevel: summonerData.summonerLevel,
            region,
            profileData,
          });
        }
      } catch {
        if (requestIdRef.current === requestId) {
          setError('Network error. Please check your connection.');
          setIsLoading(false);
        }
      }
    };

    fetchData();
  }, [gameName, tagLine]);

  return { profile, puuid, isLoading, error };
}
