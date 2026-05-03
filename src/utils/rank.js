const TIER_ORDER = [
  'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
  'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER',
]

const TIER_BASE = Object.fromEntries(
  TIER_ORDER.map((t, i) => [t, i * 400])
)

const DIV_ORDER = ['IV', 'III', 'II', 'I']

export function rankToNumber(tier, division, lp) {
  const t = (tier || '').toUpperCase()
  const base = TIER_BASE[t]
  if (base == null) return 0
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(t)) {
    return base + (lp || 0)
  }
  const div = typeof division === 'string'
    ? DIV_ORDER.indexOf(division.toUpperCase())
    : -1
  const divOffset = div >= 0 ? div * 100 : 200
  return base + divOffset + (lp || 0)
}

export function numberToRankLabel(value, showDivision = false) {
  if (value <= 0) return ''
  const idx = Math.min(Math.floor(value / 400), TIER_ORDER.length - 1)
  const tier = TIER_ORDER[idx]
  if (!tier) return ''
  const name = tier.charAt(0) + tier.slice(1).toLowerCase()
  if (!showDivision) return name
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier)) return name
  const remainder = value % 400
  const divIdx = Math.min(Math.floor(remainder / 100), 3)
  const divs = ['IV', 'III', 'II', 'I']
  return `${name} ${divs[divIdx]}`
}

export function rankToYAxisTicks() {
  return TIER_ORDER.map((_, i) => i * 400)
}

export function rankToYAxisLabels() {
  return TIER_ORDER.map(t => t.charAt(0) + t.slice(1).toLowerCase())
}

const FULL_TIER = 400

export function getDynamicDomain(data) {
  const values = data.map(d => d.rankValue)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const domainMin = Math.max(0, Math.floor(min / FULL_TIER) * FULL_TIER)
  const domainMax = Math.ceil(max / FULL_TIER) * FULL_TIER
  if (domainMax - domainMin < FULL_TIER) {
    return [domainMin, domainMin + FULL_TIER]
  }
  return [domainMin, domainMax]
}

export function getTierBoundaryTicks(domainMin, domainMax) {
  const ticks = []
  for (let v = Math.ceil(domainMin / FULL_TIER) * FULL_TIER; v <= domainMax; v += FULL_TIER) {
    ticks.push(v)
  }
  return ticks
}

export function getTierBoundaries(domainMin, domainMax) {
  const lines = []
  for (let v = Math.ceil(domainMin / FULL_TIER) * FULL_TIER; v <= domainMax; v += FULL_TIER) {
    if (v > domainMin) {
      lines.push(v)
    }
  }
  return lines
}

export function tierFromValue(value) {
  const idx = Math.min(Math.floor(value / FULL_TIER), TIER_ORDER.length - 1)
  return TIER_ORDER[idx]
}
