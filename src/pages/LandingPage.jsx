import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import SummonerSearch from '../components/SummonerSearch';
import styles from './LandingPage.module.css';

export default function LandingPage({ onSearch }) {
  const [error, setError] = useState('');
  const { t } = useLanguage();

  const handleSearch = async (username, tagLine) => {
    setError('');
    try {
      await onSearch(username, tagLine, setError);
    } catch {
      setError('An error occurred.');
    }
  };

  return (
    <div className={styles.landingContainer}>
      <h1 className={styles.landingTitle}>{t('welcome')}</h1>
      <p className={styles.landingSubtitle}>{t('subtitle')}</p>
      <div className={styles.searchSection}>
        <SummonerSearch onSearch={handleSearch} />
        {error && <div className={styles.errorMsg}>{error}</div>}
      </div>
    </div>
  );
}
