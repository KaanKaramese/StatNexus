import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './MatchList.module.css';
import { apiFetch } from '../api';
import { useLanguage } from '../context/LanguageContext';
import Skeleton from './Skeleton';
import ChampionMastery from './ChampionMastery';
import { championIcon, itemIcon, spellIcon, preloadSpells } from '../utils/ddragon';
import { relativeTime } from '../utils/time';

const MATCH_REQUEST_SPACING_MS = 120;
const RATE_LIMIT_RETRY_LIMIT = 3;
const RATE_LIMIT_BACKOFF_BASE_MS = 500;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getRetryDelayMs = (response, attempt) => {
  const retryAfter = response.headers.get('Retry-After');
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);
  }
  return RATE_LIMIT_BACKOFF_BASE_MS * Math.pow(2, attempt);
};

const fetchJsonWithRetry = async (path, { retries = RATE_LIMIT_RETRY_LIMIT } = {}) => {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await apiFetch(path);
    if (response.ok) return response.json();
    if (response.status === 429 && attempt < retries) {
      const delayMs = getRetryDelayMs(response, attempt);
      await sleep(delayMs);
      continue;
    }
    const message = response.status === 429
      ? 'Rate limit exceeded. Please try again shortly.'
      : 'Request failed.';
    throw new Error(message);
  }
  throw new Error('Request failed.');
};

const queueIdToMode = {
  400: 'Normal Draft', 420: 'Ranked Solo/Duo', 430: 'Normal Blind', 440: 'Ranked Flex', 450: 'ARAM',
  700: 'Clash', 490: 'Quickplay', 900: 'ARURF', 1020: 'One for All', 1400: 'Ultimate Spellbook',
  1300: 'Nexus Blitz', 1700: 'Arena', 1710: 'Arena', 1810: 'Swarm', 1820: 'Swarm', 1830: 'Swarm', 1840: 'Swarm', 0: 'Custom',
};

function getMatchSummary(match, puuID) {
  if (!match.info || !Array.isArray(match.info.participants)) return null;
  const participants = match.info.participants;
  const currentSummoner = participants.find(s => s.puuid === puuID);
  if (!currentSummoner) return null;
  const team1 = participants.filter(p => p.teamId === 100);
  const team2 = participants.filter(p => p.teamId === 200);
  const team1Gold = team1.reduce((sum, p) => sum + (p.goldEarned || 0), 0);
  const team2Gold = team2.reduce((sum, p) => sum + (p.goldEarned || 0), 0);
  const team1Win = team1[0]?.win;
  const team2Win = team2[0]?.win;
  const team = currentSummoner.teamId === 100 ? team1 : team2;
  const teamKills = team.reduce((sum, p) => sum + (p.kills || 0), 0);
  const killParticipation = teamKills > 0 ? (((currentSummoner.kills + currentSummoner.assists) / teamKills) * 100).toFixed(1) : '0.0';
  const cs = (currentSummoner.totalMinionsKilled || 0) + (currentSummoner.neutralMinionsKilled || 0);
  const durationMinutes = match.info.gameDuration ? (match.info.gameDuration / 60) : ((match.info.gameEndTimestamp - match.info.gameStartTimestamp) / 1000 / 60);
  const csPerMin = durationMinutes > 0 ? (cs / durationMinutes).toFixed(1) : '0.0';
  const kda = ((currentSummoner.kills + currentSummoner.assists) / Math.max(1, currentSummoner.deaths)).toFixed(2);
  const summonerChampIcon = championIcon(currentSummoner.championName) || '';
  let mode = match.info.queueId && queueIdToMode[match.info.queueId] ? queueIdToMode[match.info.queueId] : (match.info.gameMode && match.info.gameMode !== 'CLASSIC' ? match.info.gameMode : 'Classic');
  if (match.info.gameMode === 'CLASSIC' && (!match.info.queueId || !queueIdToMode[match.info.queueId])) {
    mode = 'Classic';
  }

  const items = [0, 1, 2, 3, 4, 5, 6].map(i => currentSummoner[`item${i}`] || 0);
  const spell1IconUrl = spellIcon(currentSummoner.summoner1Id);
  const spell2IconUrl = spellIcon(currentSummoner.summoner2Id);
  const gameDurSec = match.info.gameDuration || 0;
  const durMin = Math.floor(gameDurSec / 60);
  const durSec = Math.floor(gameDurSec % 60);
  const duration = `${durMin}:${String(durSec).padStart(2, '0')}`;

  const pk = currentSummoner.pentaKills || 0;
  const qk = currentSummoner.quadraKills || 0;
  const tk = currentSummoner.tripleKills || 0;
  const dk = currentSummoner.doubleKills || 0;
  const multiParts = [];
  if (pk > 0) multiParts.push(`Penta x${pk}`);
  if (qk > 0) multiParts.push(`Quadra x${qk}`);
  if (tk > 0) multiParts.push(`Triple x${tk}`);
  if (dk > 0) multiParts.push(`Double x${dk}`);

  const position = currentSummoner.teamPosition || '';

  return {
    summonerName: currentSummoner.summonerName || '',
    championName: currentSummoner.championName,
    kills: currentSummoner.kills,
    deaths: currentSummoner.deaths,
    assists: currentSummoner.assists,
    win: currentSummoner.win,
    gameMode: match.info.gameMode,
    queueId: match.info.queueId,
    kda,
    champIcon: summonerChampIcon,
    time: new Date(match.info.gameEndTimestamp).toLocaleString(),
    matchId: match.metadata?.matchId,
    team1,
    team2,
    team1Gold,
    team2Gold,
    team1Win,
    team2Win,
    killParticipation,
    cs,
    csPerMin,
    mode,
    items,
    spell1Icon: spell1IconUrl,
    spell2Icon: spell2IconUrl,
    duration,
    multiKillText: multiParts.join(' | '),
    position,
  };
}

export default function MatchList({ puuID }) {
  const { t } = useLanguage();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [expanded, setExpanded] = useState({});
  const [timelines, setTimelines] = useState({});
  const [activeFilter, setActiveFilter] = useState('All');
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  React.useEffect(() => {
    if (!puuID) return;
    setLoading(true);
    setError('');
    setWarning('');
    setHasMore(true);

    const loadMatches = async () => {
      try {
        const ids = await fetchJsonWithRetry(
          `/riot/lol/match/v5/matches/by-puuid/${puuID}/ids?start=0&count=10`
        );
        if (!Array.isArray(ids) || ids.length === 0) {
          setError('No matches found for this summoner.');
          setMatches([]);
          setLoading(false);
          return;
        }

        if (ids.length < 10) setHasMore(false);

        const matchData = [];
        let failedCount = 0;
        for (const id of ids) {
          try {
            const match = await fetchJsonWithRetry(
              `/riot/lol/match/v5/matches/${id}`
            );
            matchData.push(match);
          } catch {
            failedCount += 1;
          }
          await sleep(MATCH_REQUEST_SPACING_MS);
        }

        if (failedCount > 0 && matchData.length > 0) {
          setWarning(`Some matches could not be loaded due to rate limits. Showing ${matchData.length} matches.`);
        }
        if (matchData.length === 0) {
          setError('Failed to load matches. Please try again shortly.');
        }

        await preloadSpells();
        setMatches(matchData);
        setLoading(false);
      } catch (e) {
        setError(e?.message || 'Network error while fetching matches.');
        setLoading(false);
      }
    };

    loadMatches();
  }, [puuID]);

  const summaryStats = React.useMemo(() => {
    if (!matches.length) return null;
    let wins = 0, totalKills = 0, totalDeaths = 0, totalAssists = 0;
    let totalKP = 0, totalCS = 0, count = 0;

    matches.forEach(match => {
      const s = getMatchSummary(match, puuID);
      if (!s) return;
      count++;
      if (s.win) wins++;
      totalKills += s.kills;
      totalDeaths += s.deaths;
      totalAssists += s.assists;
      totalKP += parseFloat(s.killParticipation);
      totalCS += parseInt(s.cs, 10);
    });

    if (count === 0) return null;
    return {
      winRate: ((wins / count) * 100).toFixed(0),
      avgKDA: ((totalKills + totalAssists) / Math.max(1, totalDeaths)).toFixed(2),
      avgKP: (totalKP / count).toFixed(1),
      avgCS: Math.round(totalCS / count),
    };
  }, [matches, puuID]);

  const availableFilters = React.useMemo(() => {
    const modes = new Set(['All']);
    matches.forEach(match => {
      const s = getMatchSummary(match, puuID);
      if (s?.mode) modes.add(s.mode);
    });
    return [...modes];
  }, [matches, puuID]);

  const filteredMatches = React.useMemo(() => {
    if (activeFilter === 'All') return matches;
    return matches.filter(match => {
      const s = getMatchSummary(match, puuID);
      return s?.mode === activeFilter;
    });
  }, [matches, activeFilter, puuID]);

  const champStats = React.useMemo(() => {
    const stats = {};
    matches.forEach(match => {
      const s = getMatchSummary(match, puuID);
      if (!s) return;
      if (!stats[s.championName]) {
        stats[s.championName] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, icon: s.champIcon };
      }
      stats[s.championName].games++;
      if (s.win) stats[s.championName].wins++;
      stats[s.championName].kills += s.kills;
      stats[s.championName].deaths += s.deaths;
      stats[s.championName].assists += s.assists;
    });
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        ...data,
        winRate: ((data.wins / data.games) * 100).toFixed(0),
        kda: ((data.kills + data.assists) / Math.max(1, data.deaths)).toFixed(2),
      }))
      .sort((a, b) => b.games - a.games)
      .slice(0, 5);
  }, [matches, puuID]);

  const loadMoreMatches = async () => {
    setLoadingMore(true);
    try {
      const ids = await fetchJsonWithRetry(
        `/riot/lol/match/v5/matches/by-puuid/${puuID}/ids?start=${matches.length}&count=10`
      );
      if (!Array.isArray(ids) || ids.length === 0) {
        setHasMore(false);
        setLoadingMore(false);
        return;
      }
      const newMatchData = [];
      for (const id of ids) {
        try {
          const match = await fetchJsonWithRetry(`/riot/lol/match/v5/matches/${id}`);
          newMatchData.push(match);
        } catch { /* skip failed */ }
        await sleep(MATCH_REQUEST_SPACING_MS);
      }
      await preloadSpells();
      setMatches(prev => [...prev, ...newMatchData]);
      if (newMatchData.length < 10) setHasMore(false);
      setLoadingMore(false);
    } catch {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.matchesList}>
        {[1, 2, 3].map(i => (
          <div key={i} className={styles.matchCardOuter}>
            <div className={styles.matchCardInner} style={{ background: 'var(--surface-gunmetal)', padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Skeleton width={48} height={48} borderRadius="50%" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Skeleton width="60%" height={20} borderRadius="4px" />
                  <Skeleton width="80%" height={16} borderRadius="4px" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) return <div className={styles.msgError}>{error}</div>;
  if (!matches.length) return <div className={styles.msgEmpty}>No matches found.</div>;

  return (
    <div className={styles.matchesList}>
      {summaryStats && (
        <div className={styles.summaryBar}>
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue}>{summaryStats.winRate}%</span>
            <span className={styles.summaryLabel}>Win Rate</span>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue}>{summaryStats.avgKDA}:1</span>
            <span className={styles.summaryLabel}>Avg KDA</span>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue}>{summaryStats.avgKP}%</span>
            <span className={styles.summaryLabel}>Kill Part.</span>
          </div>
          <div className={styles.summaryStat}>
            <span className={styles.summaryValue}>{summaryStats.avgCS}</span>
            <span className={styles.summaryLabel}>Avg CS</span>
          </div>
        </div>
      )}
      {availableFilters.length > 1 && (
        <div className={styles.filterRow}>
          {availableFilters.map(mode => (
            <button
              key={mode}
              className={`${styles.filterPill} ${activeFilter === mode ? styles.filterPillActive : ''}`}
              onClick={() => setActiveFilter(mode)}
            >
              {mode === 'Ranked Solo/Duo' ? 'Ranked' : mode === 'Normal Draft' ? 'Normals' : mode === 'Normal Blind' ? 'Normals' : mode === 'Quickplay' ? 'Normals' : mode}
            </button>
          ))}
        </div>
      )}
      <ChampionMastery stats={champStats} />
      {warning && <div className={styles.msgWarning}>{warning}</div>}
      {filteredMatches.map((match, idx) => {
        const summary = getMatchSummary(match, puuID);
        if (!summary) return null;

        const timeline = timelines[idx] || {};

        const handleExpand = () => {
          setExpanded(exp => {
            const next = { ...exp, [idx]: !exp[idx] };
            if (!exp[idx] && !timelines[idx]) {
              setTimelines(tl => ({ ...tl, [idx]: { loading: true, error: '', events: [], duration: 0 } }));
              fetchJsonWithRetry(`/riot/lol/match/v5/matches/${summary.matchId}/timeline`)
                .then(timelineData => {
                  const frames = timelineData.info && Array.isArray(timelineData.info.frames) ? timelineData.info.frames : [];
                  const events = frames.flatMap(f => f.events || []);
                  const timelineEvents = [];
                  const firstBlood = events.find(e => e.type === 'CHAMPION_KILL');
                  if (firstBlood) {
                    timelineEvents.push({
                      label: 'First Blood',
                      time: firstBlood.timestamp,
                      desc: `${firstBlood.killerName || 'Unknown'} killed ${firstBlood.victimName || 'Unknown'}`,
                      icon: 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/firstblood_circle.png'
                    });
                  }
                  events.filter(e => e.type === 'ELITE_MONSTER_KILL').forEach(e => {
                    let icon = '';
                    let label = '';
                    if (e.monsterType === 'DRAGON') {
                      label = `${e.monsterSubType ? e.monsterSubType.charAt(0).toUpperCase() + e.monsterSubType.slice(1).toLowerCase() : ''} Dragon`;
                      switch ((e.monsterSubType || '').toLowerCase()) {
                        case 'infernal': icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle_fire.png'; break;
                        case 'mountain': icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle_earth.png'; break;
                        case 'ocean': icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle_water.png'; break;
                        case 'cloud': icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle_air.png'; break;
                        case 'chemtech': icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle_chemtech.png'; break;
                        case 'hextech': icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle_hextech.png'; break;
                        case 'elder': icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle.png'; break;
                        default: icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle.png';
                      }
                      timelineEvents.push({
                        label, time: e.timestamp,
                        desc: `${e.killerName || 'Team'} killed Dragon`, icon
                      });
                    } else if (e.monsterType === 'BARON_NASHOR') {
                      timelineEvents.push({
                        label: 'Baron Nashor', time: e.timestamp,
                        desc: `${e.killerName || 'Team'} killed Baron Nashor`,
                        icon: 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/baron_circle.png'
                      });
                    } else if (e.monsterType === 'RIFTHERALD') {
                      timelineEvents.push({
                        label: 'Rift Herald', time: e.timestamp,
                        desc: `${e.killerName || 'Team'} killed Rift Herald`,
                        icon: 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/sruriftherald_circle.png'
                      });
                    }
                  });
                  events.filter(e => e.type === 'BUILDING_KILL' && e.buildingType === 'TOWER_BUILDING').forEach(e => {
                    timelineEvents.push({
                      label: 'Tower', time: e.timestamp,
                      desc: `${e.killerName || 'Team'} destroyed a tower`,
                      icon: 'tower-sprite'
                    });
                  });
                  timelineEvents.sort((a, b) => a.time - b.time);
                  const matchDuration = timelineData.info && timelineData.info.gameDuration ? timelineData.info.gameDuration * 1000 : (timelineEvents.length ? timelineEvents[timelineEvents.length - 1].time : 1);
                  setTimelines(tl => ({ ...tl, [idx]: { loading: false, error: '', events: timelineEvents, duration: matchDuration } }));
                })
                .catch(() => {
                  setTimelines(tl => ({ ...tl, [idx]: { loading: false, error: 'Failed to load timeline.', events: [], duration: 0 } }));
                });
            }
            return next;
          });
        };

        let timelineContent = null;
        if (expanded[idx]) {
          if (timeline.loading) {
            timelineContent = (
              <div className={styles.timelineContainer}>
                <Skeleton width="100%" height={80} borderRadius="8px" />
              </div>
            );
          } else if (timeline.error) {
            timelineContent = (
              <div className={styles.timelineContainer}>
                <div className={styles.msgError}>{timeline.error}</div>
              </div>
            );
          } else if (timeline.events && timeline.events.length > 0) {
            timelineContent = (
              <div className={styles.timelineContainer}>
                  <div style={{ position: 'relative', height: 100 }}>
                  <div className="timeline-guide-upper" style={{ position: 'absolute', top: 30, left: 0, right: 0, height: 4, background: 'var(--surface-gunmetal)', borderRadius: 2 }}></div>
                  <div className="timeline-guide-lower" style={{ position: 'absolute', top: 70, left: 0, right: 0, height: 4, background: 'var(--surface-gunmetal)', borderRadius: 2 }}></div>
                  {timeline.events.map((ev, i) => {
                    const percent = Math.min(100, Math.max(0, (ev.time / (timeline.duration || 1)) * 100));
                    const totalSeconds = Math.floor(ev.time / 1000);
                    const minutes = Math.floor(totalSeconds / 60);
                    const seconds = totalSeconds % 60;
                    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                    const isUpper = i % 2 === 0;
                    const iconTop = isUpper ? -16 : 84;
                    let iconHTML = null;
                    if (ev.icon === 'tower-sprite') {
                      iconHTML = (
                        <span style={{ display: 'inline-block', width: 32, height: 32, background: 'url(https://raw.communitydragon.org/latest/game/assets/ux/announcements/announcementicons.png) no-repeat', backgroundSize: '256px 256px', backgroundPosition: '0px 0px', borderRadius: '50%', border: '2px solid var(--subtle-contrast)', backgroundColor: 'var(--surface-gunmetal)', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' }} title={`${ev.label} [${timeStr}]: ${ev.desc}`}></span>
                      );
                    } else {
                      iconHTML = (
                        <img src={ev.icon} alt={ev.label} title={`${ev.label} [${timeStr}]: ${ev.desc}`} className={styles.timelineIcon} />
                      );
                    }
                    return (
                      <React.Fragment key={i}>
                        <div style={{
                          position: 'absolute',
                          left: `calc(${percent}% - 2px)`,
                          top: isUpper ? 34 : 30,
                          width: 4,
                          height: isUpper ? 36 : 36,
                          background: 'var(--muted-violet)',
                          borderRadius: 2,
                          zIndex: 1
                        }}></div>
                        <div style={{
                          position: 'absolute',
                          left: `calc(${percent}% - 16px)`,
                          top: iconTop,
                          width: 32,
                          textAlign: 'center',
                          zIndex: 2
                        }}>
                          {iconHTML}
                          <div className={styles.timelineTime} style={{ marginTop: isUpper ? 2 : -36 }}>{timeStr}</div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          } else {
            timelineContent = (
              <div className={styles.timelineContainer}>
                <div className={styles.msgEmpty}>No timeline events found.</div>
              </div>
            );
          }
        }

        return (
          <div key={summary.matchId || idx} className={styles.matchCardOuter} style={{ animationDelay: `${idx * 50}ms` }}>
            <div className={`${styles.matchCardInner} ${summary.win ? styles.cardWin : styles.cardLoss}`}>
              <div className={`${styles.cardBorder} ${summary.win ? styles.borderWin : styles.borderLoss}`}></div>
              <div className={styles.summaryRow} onClick={handleExpand}>
                <div className={styles.champColumn}>
                  <div className={`${styles.winLossLabel} ${summary.win ? styles.win : styles.loss}`}>
                    {summary.win ? t('win') : t('loss')}
                  </div>
                  <img className={`${styles.championIcon} ${styles.champIconSummary}`} src={summary.champIcon} alt={summary.championName} />
                  {summary.position && (
                    <span className={`${styles.roleBadge} ${styles[`role${summary.position.charAt(0).toUpperCase() + summary.position.slice(1).toLowerCase()}`] || ''}`}>
                      {summary.position === 'BOTTOM' ? 'ADC' : summary.position === 'UTILITY' ? 'SUP' : summary.position.slice(0, 3)}
                    </span>
                  )}
                  <div className={styles.spellRow}>
                    {summary.spell1Icon && <img src={summary.spell1Icon} className={styles.spellIcon} alt="Spell 1" />}
                    {summary.spell2Icon && <img src={summary.spell2Icon} className={styles.spellIcon} alt="Spell 2" />}
                  </div>
                </div>
                <div className={styles.matchInfo}>
                  <div className={styles.scoreRow}>
                    <span className={styles.scoreKills}>{summary.kills}</span>
                    <span className={styles.scoreSep}>/</span>
                    <span className={styles.scoreDeaths}>{summary.deaths}</span>
                    <span className={styles.scoreSep}>/</span>
                    <span className={styles.scoreAssists}>{summary.assists}</span>
                  </div>
                  <div className={styles.kdaRatio}>{summary.kda}:1 KDA</div>
                  <div className={styles.matchStats}>
                    {summary.duration} | {summary.mode} | {relativeTime(match.info.gameEndTimestamp)}
                  </div>
                  <div className={styles.matchStats}>
                    KP: <span className={styles.statHighlight}>{summary.killParticipation}%</span> | CS: <span className={styles.statHighlight}>{summary.cs} ({summary.csPerMin})</span>
                  </div>
                  <div className={styles.itemRow}>
                    {summary.items.map((itemId, i) => (
                      itemId > 0
                        ? <img key={i} src={itemIcon(itemId)} className={styles.itemIconSmall} alt={`Item ${i + 1}`} />
                        : <div key={i} className={styles.itemIconSmallEmpty} />
                    ))}
                  </div>
                  {summary.multiKillText && (
                    <div className={styles.matchStats} style={{ color: '#ffcc80', fontWeight: 600 }}>{summary.multiKillText}</div>
                  )}
                </div>
                <button
                  className={`${styles.expandBtn} ${summary.win ? styles.expandBtnWin : styles.expandBtnLoss}`}
                  aria-expanded={expanded[idx] ? 'true' : 'false'}
                  onClick={(e) => { e.stopPropagation(); handleExpand(); }}
                  title={expanded[idx] ? t('hide') : t('details')}
                >
                  <span className={styles.expandIcon}>
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 9L11 14L16 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
              </div>
              {expanded[idx] && (
                <div className={styles.detailSection}>
                  <div className={styles.teamHeaderRow}>
                    <div className={`${styles.teamLabel} ${styles.teamLabelBlue}`}>Blue Team{summary.team1Win ? ' (Win)' : ''}</div>
                    <div className={`${styles.teamLabel} ${styles.teamLabelRed}`}>Red Team{summary.team2Win ? ' (Win)' : ''}</div>
                  </div>
                  <div className={styles.tableContainer}>
                    <table className={styles.teamTable}>
                      <thead>
                        <tr><th>Summoner</th><th>Champion</th><th>Items</th><th>KDA</th><th>Gold</th></tr>
                      </thead>
                      <tbody>
                        {summary.team1.map(p => (
                          <tr key={p.puuid} className={p.puuid === puuID ? styles.highlightRow : ''}>
                            <td className={styles.summNameCell}>
                              <Link
                                to={`/summoner/by-puuid/${p.puuid}`}
                                className={styles.summonerLink}
                              >
                                {p.summonerName || p.riotIdGameName || '-'}
                              </Link>
                            </td>
                            <td>
                              <img src={championIcon(p.championName) || ''} alt={p.championName} style={{ width: 22, height: 22, verticalAlign: 'middle' }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr style={{ fontWeight: 'bold' }}><td colSpan={4}>Total Gold</td><td>{summary.team1Gold}</td></tr></tfoot>
                    </table>
                    <table className={styles.teamTable}>
                      <thead>
                        <tr><th>Summoner</th><th>Champion</th><th>Items</th><th>KDA</th><th>Gold</th></tr>
                      </thead>
                      <tbody>
                        {summary.team2.map(p => (
                          <tr key={p.puuid} className={p.puuid === puuID ? styles.highlightRow : ''}>
                            <td className={styles.summNameCell}>
                              <Link
                                to={`/summoner/by-puuid/${p.puuid}`}
                                className={styles.summonerLink}
                              >
                                {p.summonerName || p.riotIdGameName || '-'}
                              </Link>
                            </td>
                            <td>
                              <img src={championIcon(p.championName) || ''} alt={p.championName} style={{ width: 22, height: 22, verticalAlign: 'middle' }} />
                            </td>
                            <td>
                              <div className={styles.itemGrid}>
                                {[0, 1, 2, 3, 4, 5, 6].map(i => {
                                  const id = p[`item${i}`];
                                  return id && id > 0
                                    ? <img key={i} src={itemIcon(id)} className={styles.itemIcon} alt="" />
                                    : <div key={i} className={styles.itemEmpty} />;
                                })}
                              </div>
                            </td>
                            <td>{p.kills}/{p.deaths}/{p.assists}</td>
                            <td>{p.goldEarned}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr style={{ fontWeight: 'bold' }}><td colSpan={4}>Total Gold</td><td>{summary.team2Gold}</td></tr></tfoot>
                    </table>
                  </div>
                  <div className={styles.goldDiffText}>
                    Gold Diff: <span className={summary.team1Gold > summary.team2Gold ? styles.goldDiffBlue : styles.goldDiffRed}>
                      {Math.abs(summary.team1Gold - summary.team2Gold)}
                    </span>
                  </div>
                  <div className={styles.goldBarRow}>
                    <span className={styles.goldBarLabel} style={{ color: 'var(--info-sky)' }}>{summary.team1Gold.toLocaleString()}g</span>
                    <div className={styles.goldBarTrack}>
                      <div className={styles.goldBarBlue} style={{ width: `${(summary.team1Gold / Math.max(summary.team1Gold + summary.team2Gold, 1) * 100).toFixed(1)}%` }}></div>
                    </div>
                    <span className={styles.goldBarLabelRight} style={{ color: 'var(--error-crimson)' }}>{summary.team2Gold.toLocaleString()}g</span>
                  </div>
                  {timelineContent}
                </div>
              )}
            </div>
          </div>
        );
      })}
      {hasMore && (
        <button
          className={styles.loadMoreBtn}
          onClick={loadMoreMatches}
          disabled={loadingMore}
        >
          {loadingMore ? 'Loading...' : 'Load More Matches'}
        </button>
      )}
    </div>
  );
}
