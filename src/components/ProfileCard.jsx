

import React from 'react';
import styles from './ProfileCard.module.css';

export default function ProfileCard({ profile }) {
  if (!profile) return null;
  return (
    <div className={styles.profileCard}>
      <div className={styles.profileAvatarContainer}>
        {profile.icon && (
          <img className={styles.profileAvatar} src={profile.icon} alt="Profile Icon" />
        )}
      </div>
      <div className={styles.profileInfo}>
        <h2 className={styles.profileName}>{profile.name || '-'}</h2>
        <p className={styles.profileLevel}>Level {profile.level || '-'}</p>
        <p className={styles.profileRank}>Rank: <span className={styles.profileRankValue}>{profile.rank || '-'}</span></p>
      </div>
    </div>
  );
}
