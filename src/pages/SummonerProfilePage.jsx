import React from 'react';
import ProfileCard from '../components/ProfileCard';
import MatchList from '../components/MatchList';
import styles from './SummonerProfilePage.module.css';

export default function SummonerProfilePage({ profile, puuID, error }) {
  return (
    <div className={styles.profilePageContainer}>
      <h2 className={styles.profileTitle}>Summoner Profile</h2>
      {error && <div className={styles.errorMsg}>{error}</div>}
      <ProfileCard profile={profile} />
      <div className={styles.matchesSection}>
        <h3>Recent Matches</h3>
        {puuID && <MatchList puuID={puuID} />}
      </div>
    </div>
  );
}
