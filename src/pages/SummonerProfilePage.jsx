import React from 'react';
import ProfileCard from '../components/ProfileCard';
import MatchList from '../components/MatchList';
import LiveGameBanner from '../components/LiveGameBanner';
import Skeleton from '../components/Skeleton';
import styles from './SummonerProfilePage.module.css';

export default function SummonerProfilePage({ profile, puuID, error, isLoading }) {
  return (
    <div className={styles.profilePageContainer}>
      {error && <div className={styles.errorMsg}>{error}</div>}
      {!isLoading && profile && profile.encryptedSummonerId && (
        <LiveGameBanner encryptedSummonerId={profile.encryptedSummonerId} puuID={puuID} />
      )}
      <ProfileCard profile={profile} isLoading={isLoading} />
      <div className={styles.matchesSection}>
        {isLoading ? (
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
          puuID && <MatchList puuID={puuID} />
        )}
      </div>
    </div>
  );
}
