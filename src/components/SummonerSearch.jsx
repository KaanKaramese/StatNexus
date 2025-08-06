
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import styles from './SummonerSearch.module.css';

const summonerNames = [
  "Faker", "Doublelift", "Caps", "Uzi", "Rookie", "Perkz", "TheShy", "Doinb", "Chovy", "ShowMaker", "Karsa", "JackeyLove"
];

export default function SummonerSearch({ onSearch }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { t } = useLanguage();

  const handleInput = e => {
    const value = e.target.value;
    setName(value);
    if (value.trim()) {
      setSuggestions(summonerNames.filter(n => n.toLowerCase().includes(value.toLowerCase())));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };
  const handleSuggestionClick = n => {
    setName(n);
    setShowSuggestions(false);
  };
  const handleSubmit = e => {
    e.preventDefault();
    if (name && tag) onSearch(name, tag);
  };
  return (
    <form className={styles.searchForm} onSubmit={handleSubmit} autoComplete="off">
      <div className={styles.inputGroup}>
        <input type="text" className={styles.textbox} placeholder={t('summonerName')} value={name} onChange={handleInput} onBlur={()=>setTimeout(()=>setShowSuggestions(false),100)} onFocus={()=>name && setShowSuggestions(true)} />
        <input type="text" className={styles.textbox2} placeholder={t('tag')} value={tag} onChange={e=>setTag(e.target.value)} />
        <button className={styles.button} type="submit">{t('search')}</button>
        {showSuggestions && suggestions.length > 0 && (
          <ul className={styles.autocompleteList}>
            {suggestions.map(n => (
              <li key={n} className={styles.autocompleteItem} onMouseDown={()=>handleSuggestionClick(n)}>{n}</li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}
