
import React, { useState, useEffect } from 'react';
import styles from './PublishedGuides.module.css';

function getGuides() {
  return JSON.parse(localStorage.getItem('lolapp_guides') || '[]');
}

export default function PublishedGuides() {
  const [guides, setGuides] = useState([]);
  useEffect(() => {
    setGuides(getGuides());
  }, []);
  // Listen for guide changes (optional: could use a context or event)
  useEffect(() => {
    const handler = () => setGuides(getGuides());
    window.addEventListener('guide-published', handler);
    return () => window.removeEventListener('guide-published', handler);
  }, []);
  if (!guides.length) return <div style={{ color: '#b0bec5' }}>No guides published yet.</div>;
  return (
    <div className={styles.publishedGuides}>
      {guides.map((g, i) => (
        <div key={i} className={styles.guideCard}>
          <div className={styles.guideCardTitle}>{g.champion} - {g.title}</div>
          <div className={styles.guideCardMeta}>By {g.author || 'Anonymous'} on {g.date}</div>
          <div className={styles.guideCardContent} style={{whiteSpace:'pre-line'}}>{g.content}</div>
        </div>
      ))}
    </div>
  );
}
