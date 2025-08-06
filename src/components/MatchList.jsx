

import React, { useState } from 'react';
import styles from './MatchList.module.css';

const api_key = "RGAPI-044798d1-59b2-40a2-ae1e-0dc82ee656d4";

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
  const champIcon = `https://ddragon.leagueoflegends.com/cdn/10.18.1/img/champion/${currentSummoner.championName}.png`;
  let mode = match.info.queueId && queueIdToMode[match.info.queueId] ? queueIdToMode[match.info.queueId] : (match.info.gameMode && match.info.gameMode !== 'CLASSIC' ? match.info.gameMode : 'Classic');
  if (match.info.gameMode === 'CLASSIC' && (!match.info.queueId || !queueIdToMode[match.info.queueId])) {
    mode = 'Classic';
  }
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
    champIcon,
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
  };
}

import { useLanguage } from '../context/LanguageContext';

export default function MatchList({ puuID }) {
  const { t } = useLanguage();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  // timeline state: { [idx]: { loading, error, events, duration } }
  const [timelines, setTimelines] = useState({});

  React.useEffect(() => {
    if (!puuID) return;
    setLoading(true);
    setError('');
    fetch(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuID}/ids?start=0&count=10&api_key=${api_key}`)
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch match history.'))
      .then(ids => {
        if (!Array.isArray(ids) || ids.length === 0) {
          setError('No matches found for this summoner.');
          setMatches([]);
          setLoading(false);
          return;
        }
        Promise.all(ids.map(id =>
          fetch(`https://europe.api.riotgames.com/lol/match/v5/matches/${id}?api_key=${api_key}`)
            .then(r => r.ok ? r.json() : null)
        )).then(matchData => {
          setMatches(matchData.filter(Boolean));
          setLoading(false);
        });
      })
      .catch(e => {
        setError(typeof e === 'string' ? e : 'Network error while fetching matches.');
        setLoading(false);
      });
  }, [puuID]);

  if (loading) return <div>Loading matches...</div>;
  if (error) return <div style={{ color: '#e57373' }}>{error}</div>;
  if (!matches.length) return <div style={{ color: '#b0bec5' }}>No matches found.</div>;

  return (
    <div className={styles.matchesList}>
      {matches.map((match, idx) => {
        const summary = getMatchSummary(match, puuID);
        if (!summary) return null;
        const bgColor = summary.win ? '#2F436E' : '#f7665e33';
        const borderColor = summary.win ? '#5383E8' : '#E84057';

        // Timeline fetch logic
        const timeline = timelines[idx] || {};

        // Handler for expanding/collapsing
        const handleExpand = () => {
          setExpanded(exp => {
            const next = { ...exp, [idx]: !exp[idx] };
            // If expanding and timeline not loaded, fetch it
            if (!exp[idx] && !timelines[idx]) {
              setTimelines(tl => ({ ...tl, [idx]: { loading: true, error: '', events: [], duration: 0 } }));
              fetch(`https://europe.api.riotgames.com/lol/match/v5/matches/${summary.matchId}/timeline?api_key=${api_key}`)
                .then(res => res.ok ? res.json() : Promise.reject('Timeline fetch failed'))
                .then(timelineData => {
                  // Parse events
                  const frames = timelineData.info && Array.isArray(timelineData.info.frames) ? timelineData.info.frames : [];
                  const events = frames.flatMap(f => f.events || []);
                  let timelineEvents = [];
                  // First blood
                  const firstBlood = events.find(e => e.type === 'CHAMPION_KILL');
                  if (firstBlood) {
                    timelineEvents.push({
                      label: 'First Blood',
                      time: firstBlood.timestamp,
                      desc: `${firstBlood.killerName || 'Unknown'} killed ${firstBlood.victimName || 'Unknown'}`,
                      icon: 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/firstblood_circle.png'
                    });
                  }
                  // Dragons/barons/heralds
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
                        label,
                        time: e.timestamp,
                        desc: `${e.killerName || 'Team'} killed Dragon`,
                        icon
                      });
                    } else if (e.monsterType === 'BARON_NASHOR') {
                      timelineEvents.push({
                        label: 'Baron Nashor',
                        time: e.timestamp,
                        desc: `${e.killerName || 'Team'} killed Baron Nashor`,
                        icon: 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/baron_circle.png'
                      });
                    } else if (e.monsterType === 'RIFTHERALD') {
                      timelineEvents.push({
                        label: 'Rift Herald',
                        time: e.timestamp,
                        desc: `${e.killerName || 'Team'} killed Rift Herald`,
                        icon: 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/sruriftherald_circle.png'
                      });
                    }
                  });
                  // Towers
                  events.filter(e => e.type === 'BUILDING_KILL' && e.buildingType === 'TOWER_BUILDING').forEach(e => {
                    timelineEvents.push({
                      label: 'Tower',
                      time: e.timestamp,
                      desc: `${e.killerName || 'Team'} destroyed a tower`,
                      icon: 'tower-sprite'
                    });
                  });
                  // Sort by time
                  timelineEvents.sort((a, b) => a.time - b.time);
                  // Get match duration in ms
                  const matchDuration = timelineData.info && timelineData.info.gameDuration ? timelineData.info.gameDuration * 1000 : (timelineEvents.length ? timelineEvents[timelineEvents.length-1].time : 1);
                  setTimelines(tl => ({ ...tl, [idx]: { loading: false, error: '', events: timelineEvents, duration: matchDuration } }));
                })
                .catch(() => {
                  setTimelines(tl => ({ ...tl, [idx]: { loading: false, error: 'Failed to load timeline.', events: [], duration: 0 } }));
                });
            }
            return next;
          });
        };

        // Timeline rendering (upper/lower lines, merge at events)
        let timelineContent = null;
        if (expanded[idx]) {
          if (timeline.loading) {
            timelineContent = <div style={{ color: '#b0bec5' }}>Loading timeline...</div>;
          } else if (timeline.error) {
            timelineContent = <div style={{ color: '#e57373' }}>{timeline.error}</div>;
          } else if (timeline.events && timeline.events.length > 0) {
            // Timeline height: 100px, upper line at 30px, lower at 70px, merge at event
            timelineContent = (
              <div style={{ position: 'relative', height: 100, margin: '24px 0 8px 0' }}>
                {/* Upper and lower lines */}
                <div style={{ position: 'absolute', top: 30, left: 0, right: 0, height: 4, background: '#e3eaf3', borderRadius: 2 }}></div>
                <div style={{ position: 'absolute', top: 70, left: 0, right: 0, height: 4, background: '#e3eaf3', borderRadius: 2 }}></div>
                {/* Events */}
                {timeline.events.map((ev, i) => {
                  const percent = Math.min(100, Math.max(0, (ev.time / (timeline.duration || 1)) * 100));
                  const totalSeconds = Math.floor(ev.time / 1000);
                  const minutes = Math.floor(totalSeconds / 60);
                  const seconds = totalSeconds % 60;
                  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                  let iconHTML = null;
                  if (ev.icon === 'tower-sprite') {
                    iconHTML = (
                      <span style={{ display: 'inline-block', width: 32, height: 32, background: 'url(https://raw.communitydragon.org/latest/game/assets/ux/announcements/announcementicons.png) no-repeat', backgroundSize: '256px 256px', backgroundPosition: '0px 0px', borderRadius: '50%', border: '2px solid #e3eaf3', backgroundColor: '#fff', filter: 'drop-shadow(0 2px 4px #b0bec5)' }} title={ev.label + ' [' + timeStr + ']: ' + ev.desc}></span>
                    );
                  } else {
                    iconHTML = (
                      <img src={ev.icon} alt={ev.label} title={ev.label + ' [' + timeStr + ']: ' + ev.desc} style={{ width: 32, height: 32, cursor: 'pointer', filter: 'drop-shadow(0 2px 4px #b0bec5)', background: '#fff', borderRadius: '50%', border: '2px solid #e3eaf3' }} />
                    );
                  }
                  // Alternate above/below
                  const isUpper = i % 2 === 0;
                  const iconTop = isUpper ? -16 : 84;
                  const connectorTop = isUpper ? 34 : 70;
                  const connectorHeight = isUpper ? 16 : -16;
                  return (
                    <React.Fragment key={i}>
                      {/* Vertical connector */}
                      <div style={{
                        position: 'absolute',
                        left: `calc(${percent}% - 2px)`,
                        top: isUpper ? 34 : 30,
                        width: 4,
                        height: isUpper ? 36 : 36,
                        background: '#b0bec5',
                        borderRadius: 2,
                        zIndex: 1
                      }}></div>
                      {/* Icon and time */}
                      <div style={{
                        position: 'absolute',
                        left: `calc(${percent}% - 16px)`,
                        top: iconTop,
                        width: 32,
                        textAlign: 'center',
                        zIndex: 2
                      }}>
                        {iconHTML}
                        <div style={{ fontSize: '0.85em', color: '#789', marginTop: isUpper ? 2 : -36 }}>{timeStr}</div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            );
          } else {
            timelineContent = <div style={{ color: '#b0bec5' }}>No timeline events found.</div>;
          }
        }

        return (
          <div key={summary.matchId || idx} className={styles.matchCard} style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative', background: bgColor, borderRadius: 12, boxShadow: '0 2px 8px 0 #e3eaf3', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: borderColor, borderRadius: '12px 0 0 12px' }}></div>
              <div className="match-summary" style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', paddingLeft: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 12 }}>
                  <div className={styles.winLossLabel + ' ' + (summary.win ? styles.win : styles.loss)}>
                    {summary.win ? t('win') : t('loss')}
                  </div>
                  <img className={styles.championIcon} src={summary.champIcon} alt={summary.championName} style={{ width: 48, height: 48 }} />
                </div>
                <div className={styles.matchInfo} style={{ flex: 1 }}>
                  <div className={styles.scoreRow}>
                    <span className={styles.scoreKills}>{summary.kills}</span>
                    <span style={{ color: '#b0bec5', fontWeight: 400, margin: '0 4px' }}>/</span>
                    <span className={styles.scoreDeaths}>{summary.deaths}</span>
                    <span style={{ color: '#b0bec5', fontWeight: 400, margin: '0 4px' }}>/</span>
                    <span className={styles.scoreAssists}>{summary.assists}</span>
                  </div>
                  <div className={styles.kdaRatio}>{summary.kda}:1 {t('kda')}</div>
                  <div className={styles.matchStats}>{t('mode')}: {summary.mode} | <span style={{ fontSize: '0.95em' }}>{summary.time}</span></div>
                  <div className={styles.matchStats}>{t('killParticipation')}: <span style={{ color: '#4fc3f7' }}>{summary.killParticipation}%</span> | {t('cs')}: <span style={{ color: '#4fc3f7' }}>{summary.cs} ({summary.csPerMin})</span></div>
                </div>
                <button
                  className={styles.expandBtn}
                  aria-expanded={expanded[idx] ? 'true' : 'false'}
                  onClick={handleExpand}
                  title={expanded[idx] ? t('hide') : t('details')}
                >
                  <span className={styles.expandIcon}>
                    {/* Down arrow SVG */}
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 9L11 14L16 9" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
              </div>
              {expanded[idx] && (
                <div className={styles.matchDetails} style={{ padding: '16px 0 0 0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 'bold', color: '#4fc3f7' }}>{t('blueTeam')}{summary.team1Win ? ' (' + t('win') + ')' : ''}</div>
                    <div style={{ fontWeight: 'bold', color: '#e57373' }}>{t('redTeam')}{summary.team2Win ? ' (' + t('win') + ')' : ''}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <table className="team-table" style={{ flex: 1, width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th>Summoner</th><th>Champion</th><th>{t('kda')}</th><th>{t('gold')}</th></tr></thead>
                      <tbody>
                        {summary.team1.map(p => (
                          <tr key={p.puuid} style={{ background: p.puuid === puuID ? '#e3f2fd' : 'transparent' }}>
                            <td>{p.summonerName && p.summonerName !== '-' ? p.summonerName : '-'}</td>
                            <td><img src={`https://ddragon.leagueoflegends.com/cdn/10.18.1/img/champion/${p.championName}.png`} alt={p.championName} style={{ width: 24, height: 24, verticalAlign: 'middle' }} /> {p.championName}</td>
                            <td>{p.kills}/{p.deaths}/{p.assists}</td>
                            <td>{p.goldEarned}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr style={{ fontWeight: 'bold' }}><td colSpan={3}>{t('totalGold')}</td><td>{summary.team1Gold}</td></tr></tfoot>
                    </table>
                    <table className="team-table" style={{ flex: 1, width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr><th>Summoner</th><th>Champion</th><th>{t('kda')}</th><th>{t('gold')}</th></tr></thead>
                      <tbody>
                        {summary.team2.map(p => (
                          <tr key={p.puuid} style={{ background: p.puuid === puuID ? '#e3f2fd' : 'transparent' }}>
                            <td>{p.summonerName && p.summonerName !== '-' ? p.summonerName : '-'}</td>
                            <td><img src={`https://ddragon.leagueoflegends.com/cdn/10.18.1/img/champion/${p.championName}.png`} alt={p.championName} style={{ width: 24, height: 24, verticalAlign: 'middle' }} /> {p.championName}</td>
                            <td>{p.kills}/{p.deaths}/{p.assists}</td>
                            <td>{p.goldEarned}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr style={{ fontWeight: 'bold' }}><td colSpan={3}>{t('totalGold')}</td><td>{summary.team2Gold}</td></tr></tfoot>
                    </table>
                  </div>
                  <div style={{ marginTop: 12, fontWeight: 'bold' }}>{t('goldDiff')}: <span style={{ color: summary.team1Gold > summary.team2Gold ? '#4fc3f7' : '#e57373' }}>{Math.abs(summary.team1Gold - summary.team2Gold)}</span></div>
                  <div style={{ margin: '10px 0 18px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: '#4fc3f7', fontWeight: 'bold', minWidth: 60 }}>{summary.team1Gold.toLocaleString()}g</span>
                      <div style={{ flex: 1, height: 22, position: 'relative', background: '#e3eaf3', borderRadius: 12, overflow: 'hidden', minWidth: 120, maxWidth: 400 }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(summary.team1Gold / (summary.team1Gold + summary.team2Gold) * 100).toFixed(1)}%`, background: '#4fc3f7' }}></div>
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${(summary.team2Gold / (summary.team1Gold + summary.team2Gold) * 100).toFixed(1)}%`, background: '#e57373' }}></div>
                      </div>
                      <span style={{ color: '#e57373', fontWeight: 'bold', minWidth: 60, textAlign: 'right' }}>{summary.team2Gold.toLocaleString()}g</span>
                    </div>
                  </div>
                  <div className="timeline-container" style={{ marginTop: 18 }}>{timelineContent}</div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
