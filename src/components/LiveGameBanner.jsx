import React, { useState, useEffect, useRef } from 'react'
import { apiFetch } from '../api'
import { championNameById, championIconById } from '../utils/ddragon'
import styles from './LiveGameBanner.module.css'

const POLL_INTERVAL_MS = 30000
const queueIdToMode = {
  400: 'Normal Draft', 420: 'Ranked Solo/Duo', 430: 'Normal Blind', 440: 'Ranked Flex', 450: 'ARAM',
  700: 'Clash', 490: 'Quickplay', 900: 'ARURF', 1700: 'Arena', 1710: 'Arena',
}

export default function LiveGameBanner({ encryptedSummonerId, puuID }) {
  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const pollingRef = useRef(null)

  useEffect(() => {
    if (!encryptedSummonerId) {
      setLoading(false)
      return
    }

    let cancelled = false

    const fetchActiveGame = async () => {
      try {
        const res = await apiFetch(
          `/riot/lol/spectator/v5/active-games/by-summoner/${encryptedSummonerId}`
        )
        if (cancelled) return
        if (res.ok) {
          const data = await res.json()
          setGame(data)
        } else {
          setGame(null)
        }
      } catch {
        if (!cancelled) setGame(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchActiveGame()

    pollingRef.current = setInterval(fetchActiveGame, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(pollingRef.current)
    }
  }, [encryptedSummonerId])

  if (loading || !game) return null

  const participant = game.participants?.find(p => p.puuid === puuID)
  const championId = participant?.championId
  const championName = championNameById(championId)
  const champIcon = championIconById(championId)
  const mode = queueIdToMode[game.gameQueueConfigId] || game.gameMode || 'Custom'
  const startTime = game.gameStartTime || 0
  const elapsed = Math.floor((Date.now() - startTime) / 1000)
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const duration = `${minutes}:${String(seconds).padStart(2, '0')}`

  return (
    <div className={styles.banner}>
      <div className={styles.bannerInner}>
        <div className={styles.bannerLeft}>
          <span className={styles.liveDot} />
          <span className={styles.liveLabel}>Live</span>
        </div>
        {champIcon && (
          <img src={champIcon} alt={championName} className={styles.bannerChamp} />
        )}
        <div className={styles.bannerInfo}>
          <span className={styles.bannerChampName}>{championName}</span>
          <span className={styles.bannerMode}>{mode}</span>
          <span className={styles.bannerDuration}>{duration}</span>
        </div>
      </div>
    </div>
  )
}
