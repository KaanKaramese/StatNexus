
import React, { useState } from 'react';
import styles from './GuideForm.module.css';

function getGuides() {
  return JSON.parse(localStorage.getItem('lolapp_guides') || '[]');
}
function saveGuides(guides) {
  localStorage.setItem('lolapp_guides', JSON.stringify(guides));
}

export default function GuideForm({ user, onPublish }) {
  const [champion, setChampion] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [msg, setMsg] = useState('');
  const [msgColor, setMsgColor] = useState('#e57373');

  const handleSubmit = e => {
    e.preventDefault();
    if (!champion || !title.trim() || !content.trim()) {
      setMsg('Please fill all fields.');
      setMsgColor('#e57373');
      return;
    }
    const guides = getGuides();
    const newGuide = {
      champion,
      title: title.trim(),
      content: content.trim(),
      author: user || 'Anonymous',
      date: new Date().toLocaleString()
    };
    guides.unshift(newGuide);
    saveGuides(guides);
    setMsg('Guide published!');
    setMsgColor('#4fc3f7');
    setChampion('');
    setTitle('');
    setContent('');
    if (onPublish) onPublish();
    setTimeout(() => { setMsg(''); setMsgColor('#e57373'); }, 2000);
  };

  return (
    <form id="guide-form" className={styles.guideForm} onSubmit={handleSubmit}>
      <label htmlFor="champion-select" className={styles.guideFormTitle}>Champion:</label>
      <select id="champion-select" required value={champion} onChange={e=>setChampion(e.target.value)} className={styles.guideFormInput}>
        <option value="">Select a champion</option>
        <option>Ahri</option>
        <option>Akali</option>
        <option>Ashe</option>
        <option>Garen</option>
        <option>Jinx</option>
        <option>Lux</option>
        <option>Yasuo</option>
        <option>Zed</option>
      </select>
      <label htmlFor="guide-title" className={styles.guideFormTitle}>Guide Title:</label>
      <input id="guide-title" type="text" required maxLength={60} value={title} onChange={e=>setTitle(e.target.value)} className={styles.guideFormInput} />
      <label htmlFor="guide-content" className={styles.guideFormTitle}>Content:</label>
      <textarea id="guide-content" required rows={8} maxLength={2000} value={content} onChange={e=>setContent(e.target.value)} className={styles.guideFormTextarea}></textarea>
      <button type="submit" className={styles.guideFormButton}>Publish Guide</button>
      <div id="guide-form-msg" style={{marginTop:10,color:msgColor}}>{msg}</div>
    </form>
  );
}
