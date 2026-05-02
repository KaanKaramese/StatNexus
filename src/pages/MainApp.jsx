import { useLanguage } from '../context/LanguageContext';
import React, { useState } from 'react';
import SummonerSearch from '../components/SummonerSearch';
import ProfileCard from '../components/ProfileCard';
import MatchList from '../components/MatchList';
import styles from './MainApp.module.css';
import { apiFetch } from '../api';

export default function MainApp() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [puuID, setPuuID] = useState(null);
  const [error, setError] = useState('');

  const trackSummonerSearch = async (gameName, tagLine, profileIconId, summonerLevel) => {
    if (!gameName || !tagLine) return;
    try {
      await apiFetch('/summoners/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameName, tagLine, profileIconId, summonerLevel })
      });
    } catch {
      // ignore tracking errors
    }
  };

  const handleSearch = async (username, tagLine) => {
    setError('');
    setProfile(null);
    setPuuID(null);
    try {
      // Step 1: Get PUUID from Riot ID through the backend
      const response = await apiFetch(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(username)}/${encodeURIComponent(tagLine)}`);
      if (!response.ok) {
        if (response.status === 404) setError('Summoner not found. Please check the name and tag.');
        else if (response.status === 403) setError('API key invalid or expired. Please update your API key.');
        else setError('Failed to fetch summoner info. Try again later.');
        return;
      }
      const res = await response.json();
      if (!res.puuid) {
        setError('Invalid summoner data received.');
        return;
      }
      setPuuID(res.puuid);
      // Step 2: Get Summoner Info (level, icon, summonerId) from PUUID
      const summonerRes = await apiFetch(`/riot/lol/summoner/v4/summoners/by-puuid/${res.puuid}`);
      if (!summonerRes.ok) {
        setError('Failed to fetch summoner profile info.');
        return;
      }
      const summonerData = await summonerRes.json();
      // Step 3: Get Rank from PUUID
      const rankRes = await apiFetch(`/riot/lol/league/v4/entries/by-puuid/${res.puuid}`);
      let rankText = '-';
      if (rankRes.ok) {
        const rankData = await rankRes.json();
        if (Array.isArray(rankData) && rankData.length > 0) {
          const solo = rankData.find(q => q.queueType === 'RANKED_SOLO_5x5');
          const entry = solo || rankData[0];
          rankText = `${entry.tier} ${entry.rank} (${entry.leaguePoints} LP)`;
        }
      }
      setProfile({
        name: res.gameName && res.tagLine ? `${res.gameName}#${res.tagLine}` : (summonerData.name || '-'),
        level: summonerData.summonerLevel,
        icon: summonerData.profileIconId != null ? `https://ddragon.leagueoflegends.com/cdn/16.9.1/img/profileicon/${summonerData.profileIconId}.png` : '',
        rank: rankText
      });
      void trackSummonerSearch(res.gameName, res.tagLine, summonerData.profileIconId, summonerData.summonerLevel);
    } catch {
      setError('Network error. Please check your connection.');
    }
  };

  return (
    <div className={styles.mainContainer} id="main-app">
      <header className={styles.header}>
        <h1 className={styles.siteTitle}>{t('subtitle')}</h1>
      </header>
      <section className={styles.searchSection}>
        <SummonerSearch onSearch={handleSearch} />
      </section>
      <section className={styles.profileSection}>
        {error && <div style={{ color: '#e57373', fontSize: '1.1em', margin: '16px 0' }}>{error}</div>}
        <ProfileCard profile={profile} />
      </section>
      <section className={styles.matchesSection}>
        <h2>{t('recentMatches')}</h2>
        {puuID && <MatchList puuID={puuID} />}
      </section>
    </div>
  );
}
