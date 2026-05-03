import React, { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import { apiFetch } from '../api'
import { rankToNumber, getDynamicDomain, getTierBoundaryTicks, getTierBoundaries, tierFromValue } from '../utils/rank'
import styles from './RankHistoryGraph.module.css'

const EMBLEM_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem'

function emblemUrl(tier) {
  if (!tier) return null
  return `${EMBLEM_BASE}-${tier.toLowerCase()}.png`
}

const TIER_COLORS = {
  IRON: '#5A5A5A',
  BRONZE: '#8C5230',
  SILVER: '#A0B4C8',
  GOLD: '#E8B83C',
  PLATINUM: '#3D8E8E',
  EMERALD: '#1F9D55',
  DIAMOND: '#4A7AF5',
  MASTER: '#9D4EDD',
  GRANDMASTER: '#E64040',
  CHALLENGER: '#F4C875',
}

function formatDate(iso) {
  const d = new Date(iso)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[d.getMonth()]} ${d.getDate()}`
}

function formatTooltipDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getPrevTierColor(data, idx) {
  for (let i = idx; i >= 0; i--) {
    const c = TIER_COLORS[data[i]?.tier?.toUpperCase()]
    if (c) return c
  }
  return 'var(--primary-accent)'
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipDate}>{formatTooltipDate(d.recorded_at)}</div>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipTier} style={{ color: TIER_COLORS[d.tier?.toUpperCase()] || '#fff' }}>
          {d.tier?.charAt(0).toUpperCase() + d.tier?.slice(1).toLowerCase()} {d.rank_division}
        </span>
        <span className={styles.tooltipLp}>{d.league_points} LP</span>
      </div>
      <div className={styles.tooltipRow}>
        <span className={styles.tooltipWins}>{d.wins}W</span>
        <span className={styles.tooltipSep}>/</span>
        <span className={styles.tooltipLosses}>{d.losses}L</span>
      </div>
    </div>
  )
}

export default function RankHistoryGraph({ puuid, queueType = 'RANKED_SOLO_5x5', rankData }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!puuid) return
    let cancelled = false
    let retryTimer = null

    function fetchRankHistory(retryCount = 0) {
      setData(null)
      setError(null)
      apiFetch(`/summoners/rank-history?puuid=${encodeURIComponent(puuid)}&queueType=${encodeURIComponent(queueType)}`)
        .then(r => {
          if (!r.ok) throw new Error('Request failed')
          return r.json()
        })
        .then(json => {
          if (cancelled) return
          if (!Array.isArray(json)) {
            throw new Error('Invalid response')
          }
          if (json.length < 2) {
            if (retryCount < 3 && json.length === 0) {
              retryTimer = setTimeout(() => fetchRankHistory(retryCount + 1), 2000)
              return
            }
            setData(json)
            return
          }
          const mapped = json.map((p, idx, arr) => ({
            ...p,
            rankValue: rankToNumber(p.tier, p.rank_division, p.league_points),
            color: getPrevTierColor(arr, idx),
          }))
          setData(mapped)
        })
        .catch(err => {
          if (!cancelled) setError(err.message || 'Failed to load rank history')
        })
    }

    fetchRankHistory()
    return () => { cancelled = true; if (retryTimer) clearTimeout(retryTimer) }
  }, [puuid, queueType])

  if (!puuid) return null

  const chartReady = data && data.length >= 2
  const yDomain = chartReady ? getDynamicDomain(data) : [0, 3200]
  const yTicks = chartReady ? getTierBoundaryTicks(yDomain[0], yDomain[1]) : []
  const tierLines = chartReady ? getTierBoundaries(yDomain[0], yDomain[1]) : []

  function YAxisTick({ x, y, payload }) {
    const value = payload.value
    if (value < 0) return null
    const tier = tierFromValue(value)
    if (!tier) return null
    const url = emblemUrl(tier)
    const size = 40
    return <image href={url} x={x - size / 2} y={y - size / 2} width={size} height={size} preserveAspectRatio="xMidYMid meet" />
  }

  return (
    <div className={styles.wrapper}>
      <h4 className={styles.title}>Rank Progression</h4>
      {error && <p className={styles.error}>{error}</p>}
      {data === null && (
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Loading rank history...
        </div>
      )}
      {data !== null && data.length === 0 && (
        <p className={styles.empty}>No rank history yet. It will build up as the summoner is searched.</p>
      )}
      {data !== null && data.length === 1 && (
        <p className={styles.empty}>Collecting data — check back after more rank updates.</p>
      )}
      {data !== null && data.length >= 2 && (
        <div className={styles.chartRow}>
          {rankData && (
            <div className={styles.rankInfo}>
              <div className={styles.rankInfoHeader}>Rank</div>
              <div className={styles.rankInfoTier}>
                {rankData.displayTier} {rankData.division || ''} - {rankData.lp} LP
              </div>
              <div className={styles.rankInfoRecord}>
                <span className={styles.rankInfoWins}>{rankData.wins}W</span>
                <span className={styles.rankInfoSep}>/</span>
                <span className={styles.rankInfoLosses}>{rankData.losses}L</span>
                <span className={styles.rankInfoRate}>({rankData.winRate}%)</span>
              </div>
              <div className={styles.rankInfoHeader}>Ladder Rank</div>
              <div className={styles.rankInfoLadder}>{rankData.ladderRank || '-'}</div>
              {rankData.percentile != null && (
                <div className={styles.rankInfoPercent}>({rankData.percentile}%)</div>
              )}
            </div>
          )}
          <div className={styles.chartContainer}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 2 }}>
              <defs>
                <linearGradient id="rankGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary-accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary-accent)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--subtle-contrast)" strokeOpacity={0.2} />
              {tierLines.map(v => (
                <ReferenceLine key={v} y={v} stroke="var(--muted-text)" strokeOpacity={0.2} strokeDasharray="6 4" />
              ))}
              <XAxis
                dataKey="recorded_at"
                tickFormatter={formatDate}
                stroke="var(--muted-text)"
                strokeOpacity={0.5}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={30}
              />
              <YAxis
                domain={yDomain}
                ticks={yTicks}
                tick={<YAxisTick />}
                stroke="var(--muted-text)"
                strokeOpacity={0.5}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--muted-text)', strokeOpacity: 0.3 }} />
              <Area
                type="monotone"
                dataKey="rankValue"
                stroke="var(--primary-accent)"
                strokeWidth={2}
                fill="url(#rankGradient)"
                dot={false}
                activeDot={{ r: 5, fill: 'var(--primary-accent)', stroke: 'var(--bg-charcoal)', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        </div>
      )}
    </div>
  )
}
