import React from 'react'
import styles from './ChampionMastery.module.css'

export default function ChampionMastery({ stats }) {
  if (!stats || stats.length === 0) return null

  return (
    <div className={styles.masterySection}>
      <h4 className={styles.masteryTitle}>Most Played</h4>
      <div className={styles.masteryGrid}>
        {stats.map(champ => (
          <div key={champ.name} className={styles.masteryCard}>
            <img src={champ.icon} alt={champ.name} className={styles.masteryIcon} />
            <div className={styles.masteryInfo}>
              <span className={styles.champName}>{champ.name}</span>
              <span className={styles.champStats}>
                {champ.games}G {champ.winRate}% &#8226; {champ.kda}:1 KDA
              </span>
              <div className={styles.winBarTrack}>
                <div
                  className={styles.winBarFill}
                  style={{ width: `${champ.winRate}%` }}
                />
                <div
                  className={styles.winBarLoss}
                  style={{ width: `${100 - champ.winRate}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
