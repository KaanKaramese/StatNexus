import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSummonerData } from '../hooks/useSummonerData';
import { apiFetch } from '../api';
import ProfileCard from '../components/ProfileCard';
import MatchList from '../components/MatchList';
import LiveGameBanner from '../components/LiveGameBanner';
import Skeleton from '../components/Skeleton';
import styles from './SummonerProfilePage.module.css';

export default function SummonerProfilePage({ onSearchSuccess }) {
  const { gameName, tagLine, puuid: puuidParam } = useParams();
  const [resolved, setResolved] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState('');

  useEffect(() => {
    if (!puuidParam) {
      setResolved(null);
      setResolveError('');
      return;
    }

    let cancelled = false;
    setResolving(true);
    setResolveError('');

    apiFetch(`/riot/account/v1/accounts/by-puuid/${puuidParam}`)
      .then(async (r) => {
        if (cancelled) return;
        if (!r.ok) throw new Error('Failed to resolve summoner');
        const data = await r.json();
        if (!data.gameName || !data.tagLine) throw new Error('Invalid account data');
        setResolved({ gameName: data.gameName, tagLine: data.tagLine });
        setResolving(false);
      })
      .catch(() => {
        if (cancelled) return;
        setResolveError('Could not load summoner info.');
        setResolving(false);
      });

    return () => { cancelled = true; };
  }, [puuidParam]);

  const effectiveGameName = resolved ? resolved.gameName : (gameName || '');
  const effectiveTagLine = resolved ? resolved.tagLine : (tagLine || '');

  const showHook = !puuidParam || resolved;
  const { profile, puuid, isLoading, error } = useSummonerData(
    showHook ? effectiveGameName : '',
    showHook ? effectiveTagLine : '',
    { onSuccess: onSearchSuccess }
  );

  const isResolving = resolving || (!resolved && !!puuidParam) || (!!puuidParam && !profile);

  return (
    <div className={styles.profilePageContainer}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {resolveError && <div className={styles.errorMsg}>{resolveError}</div>}
      {!isResolving && profile && profile.encryptedSummonerId && (
        <LiveGameBanner encryptedSummonerId={profile.encryptedSummonerId} puuID={puuid} />
      )}
      <ProfileCard profile={profile} isLoading={isLoading || isResolving} />
      <div className={styles.matchesSection}>
        {isLoading || isResolving ? (
          <div className={styles.skeletonMatchList}>
            {[1, 2, 3].map(i => (
              <div key={i} className={styles.skeletonMatchCard}>
                <Skeleton width="48px" height="48px" borderRadius="50%" />
                <div className={styles.skeletonMatchInfo}>
                  <Skeleton width="100%" height="20px" borderRadius="4px" />
                  <Skeleton width="70%" height="16px" borderRadius="4px" />
                </div>
                <Skeleton width="36px" height="36px" borderRadius="8px" />
              </div>
            ))}
          </div>
        ) : (
          puuid && <MatchList puuID={puuid} />
        )}
      </div>
    </div>
  );
}
