let _version = null
let _versionPromise = null
let _spellMap = null
let _spellMapPromise = null
let _championMap = null
let _championMapPromise = null

export function initDDragon() {
  if (_versionPromise) return _versionPromise
  _versionPromise = fetch('https://ddragon.leagueoflegends.com/api/versions.json')
    .then(r => r.json())
    .then(v => {
      _version = v[0]
      return _version
    })
  return _versionPromise
}

export async function initAll() {
  await initDDragon()
  _spellMapPromise = fetchSpellMap()
  _championMapPromise = fetchChampionMap()
  await Promise.all([_spellMapPromise, _championMapPromise])
}

export function getVersion() {
  return _version
}

export function championIcon(name) {
  if (!_version || !name) return null
  return `https://ddragon.leagueoflegends.com/cdn/${_version}/img/champion/${name}.png`
}

export function itemIcon(id) {
  if (!_version || !id || id === 0) return null
  return `https://ddragon.leagueoflegends.com/cdn/${_version}/img/item/${id}.png`
}

export function profileIcon(id) {
  if (_version == null || id == null) return null
  return `https://ddragon.leagueoflegends.com/cdn/${_version}/img/profileicon/${id}.png`
}

export function rankEmblem(tier) {
  if (!_version || !tier) return null
  const t = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()
  return `https://ddragon.leagueoflegends.com/cdn/${_version}/img/ranked-emblems/Emblem_${t}.png`
}

export function tierColor(tier) {
  const map = {
    IRON: '#5A5A5A',
    BRONZE: '#8C5230',
    SILVER: '#A0B4C8',
    GOLD: '#E8B83C',
    PLATINUM: '#3D8E8E',
    DIAMOND: '#4A7AF5',
    MASTER: '#9D4EDD',
    GRANDMASTER: '#E64040',
    CHALLENGER: '#F4C875',
  }
  return map[(tier || '').toUpperCase()] || null
}

export function parseRank(str) {
  if (!str || str === '-') return null
  const m = str.match(/^(\w+)\s+(\w+)\s+\((\d+)\s*LP\)$/i)
  if (!m) return null
  return {
    tier: m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase(),
    rank: m[2].toUpperCase(),
    lp: parseInt(m[3], 10),
  }
}

async function fetchSpellMap() {
  await _versionPromise
  const res = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${_version}/data/en_US/summoner.json`
  )
  const data = await res.json()
  _spellMap = {}
  for (const key of Object.keys(data.data)) {
    _spellMap[data.data[key].key] = data.data[key].id
  }
}

export async function preloadSpells() {
  if (!_spellMapPromise) {
    _spellMapPromise = fetchSpellMap()
  }
  await _spellMapPromise
}

export function spellIcon(id) {
  if (!_spellMap || !id || id <= 0) return null
  if (!_version) return null
  const name = _spellMap[String(id)]
  return name
    ? `https://ddragon.leagueoflegends.com/cdn/${_version}/img/spell/${name}.png`
    : null
}

async function fetchChampionMap() {
  await _versionPromise
  const res = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${_version}/data/en_US/champion.json`
  )
  const data = await res.json()
  _championMap = {}
  for (const key of Object.keys(data.data)) {
    _championMap[data.data[key].key] = data.data[key].id
  }
}

export async function preloadChampions() {
  if (!_championMapPromise) {
    _championMapPromise = fetchChampionMap()
  }
  await _championMapPromise
}

export function championNameById(id) {
  if (!_championMap || !id) return 'Unknown'
  return _championMap[String(id)] || 'Unknown'
}

export function championIconById(id) {
  const name = championNameById(id)
  if (!name || name === 'Unknown') return null
  return championIcon(name)
}
