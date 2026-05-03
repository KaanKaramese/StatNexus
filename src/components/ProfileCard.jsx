import React from 'react'
import styles from './ProfileCard.module.css'
import Skeleton from './Skeleton'
import { profileIcon, tierColor, parseRank } from '../utils/ddragon'
import RankHistoryGraph from './RankHistoryGraph'

export default function ProfileCard({ profile, isLoading }) {
  if (isLoading) {
    return (
      <div className={styles.profileCard}>
        <Skeleton width={80} height={80} borderRadius="50%" />
        <div className={styles.profileInfo}>
          <Skeleton width={180} height={24} borderRadius="4px" />
          <Skeleton width={100} height={18} borderRadius="4px" />
          <Skeleton width={140} height={22} borderRadius="6px" />
        </div>
      </div>
    )
  }

  if (!profile) return null

  const parsed = parseRank(profile.rank)
  const tier = profile.tier || parsed?.tier || null
  const lp = profile.lp ?? parsed?.lp ?? null
  const displayTier = tier ? tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase() : null
  const color = tierColor(tier)
  const totalGames = profile.wins + profile.losses
  const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : null

  return (
    <div className={styles.profileCard}>
      <div className={styles.avatarSection}>
        <div className={styles.profileAvatarContainer}>
          {profile.icon ? (
            <img
              className={styles.profileAvatar}
              src={profileIcon(profile.icon) || ''}
              alt="Profile Icon"
            />
          ) : (
            <div className={styles.avatarPlaceholder}>?</div>
          )}
        </div>
        {profile.level != null && (
          <div className={styles.levelBadge}>{profile.level}</div>
        )}
      </div>
      <div className={styles.profileInfo}>
        <h2 className={styles.profileName}>{profile.name || '-'}</h2>

        {profile.puuid && (
          <RankHistoryGraph
            puuid={profile.puuid}
            rankData={displayTier ? {
              displayTier,
              division: profile.rankDivision || parsed?.rank || '',
              lp,
              wins: profile.wins,
              losses: profile.losses,
              winRate,
              color,
            } : null}
          />
        )}
      </div>
    </div>
  )
}
