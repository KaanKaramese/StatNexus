import { useLanguage } from '../context/LanguageContext';


import React, { useState } from 'react';
import SummonerSearch from '../components/SummonerSearch';
import ProfileCard from '../components/ProfileCard';
import MatchList from '../components/MatchList';
import styles from './MainApp.module.css';

export default function MainApp() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [puuID, setPuuID] = useState(null);
  const [error, setError] = useState('');

  const handleSearch = async (username, tagLine) => {
    setError('');
    setProfile(null);
    setPuuID(null);
    try {
      // Step 1: Get PUUID from Riot ID
      const response = await fetch(`https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${username}/${tagLine}?api_key=RGAPI-044798d1-59b2-40a2-ae1e-0dc82ee656d4`);
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
      const summonerRes = await fetch(`https://tr1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${res.puuid}?api_key=RGAPI-044798d1-59b2-40a2-ae1e-0dc82ee656d4`);
      if (!summonerRes.ok) {
        setError('Failed to fetch summoner profile info.');
        return;
      }
      const summonerData = await summonerRes.json();
      // Step 3: Get Rank from PUUID
      const rankRes = await fetch(`https://tr1.api.riotgames.com/lol/league/v4/entries/by-puuid/${res.puuid}?api_key=RGAPI-044798d1-59b2-40a2-ae1e-0dc82ee656d4`);
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
        icon: summonerData.profileIconId ? `http://ddragon.leagueoflegends.com/cdn/10.18.1/img/profileicon/${summonerData.profileIconId}.png` : '',
        rank: rankText
      });
    } catch (err) {
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
