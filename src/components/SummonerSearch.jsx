
import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import styles from './SummonerSearch.module.css';
import { apiFetch } from '../api';

const SUGGESTION_DEBOUNCE_MS = 200;
const SUGGESTION_LIMIT = 6;

export default function SummonerSearch({ onSearch }) {
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const requestIdRef = useRef(0);
  const { t } = useLanguage();

  const handleInput = e => {
    const value = e.target.value;
    setName(value);
    setActiveIndex(-1);
    if (value.trim()) {
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };
  const handleSuggestionClick = suggestion => {
    setName(suggestion.gameName);
    setTag(suggestion.tagLine);
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const getHighlightedText = (text, query) => {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const idx = lowerText.indexOf(lowerQuery);
    if (idx === -1 || !query) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className={styles.highlight}>{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < suggestions.length) {
      e.preventDefault();
      handleSuggestionClick(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    const nextName = name.trim();
    const nextTag = tag.trim();
    if (nextName && nextTag) onSearch(nextName, nextTag);
  };

  useEffect(() => {
    const query = name.trim();
    if (!query) {
      setSuggestions([]);
      setSuggestionsError('');
      setLoadingSuggestions(false);
      return;
    }

    setLoadingSuggestions(true);
    setSuggestionsError('');
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timer = setTimeout(async () => {
      try {
        const response = await apiFetch(
          `/summoners/suggest?query=${encodeURIComponent(query)}&limit=${SUGGESTION_LIMIT}`
        );
        if (!response.ok) {
          throw new Error('Failed to load suggestions.');
        }
        const data = await response.json();
        if (requestIdRef.current !== requestId) return;
        setSuggestions(Array.isArray(data) ? data : []);
        setLoadingSuggestions(false);
      } catch {
        if (requestIdRef.current !== requestId) return;
        setSuggestions([]);
        setSuggestionsError('Failed to load suggestions.');
        setLoadingSuggestions(false);
      }
    }, SUGGESTION_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [name]);

  const showDropdown = showSuggestions && (loadingSuggestions || suggestionsError || suggestions.length > 0);

  return (
    <form className={styles.searchForm} onSubmit={handleSubmit} autoComplete="off">
      <div className={styles.inputGroup}>
        <input
          type="text"
          className={styles.textbox}
          placeholder={t('summonerName')}
          value={name}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
          onFocus={() => name && setShowSuggestions(true)}
        />
        <input type="text" className={styles.textbox2} placeholder={t('tag')} value={tag} onChange={e => setTag(e.target.value)} />
        <button className={styles.button} type="submit">{t('search')}</button>
        {showDropdown && (
          <ul className={styles.autocompleteList}>
            {loadingSuggestions && (
              <li className={`${styles.autocompleteItem} ${styles.autocompleteItemMuted}`}>Loading...</li>
            )}
            {!loadingSuggestions && suggestionsError && (
              <li className={`${styles.autocompleteItem} ${styles.autocompleteItemMuted}`}>{suggestionsError}</li>
            )}
            {!loadingSuggestions && !suggestionsError && suggestions.length === 0 && (
              <li className={`${styles.autocompleteItem} ${styles.autocompleteItemMuted}`}>No matches found.</li>
            )}
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.gameName}#${suggestion.tagLine}`}
                className={`${styles.autocompleteItem} ${index === activeIndex ? styles.autocompleteItemActive : ''}`}
                onMouseDown={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <div className={styles.suggestionRow}>
                  {suggestion.profileIconId != null ? (
                    <img
                      className={styles.suggestionIcon}
                      src={`https://ddragon.leagueoflegends.com/cdn/16.9.1/img/profileicon/${suggestion.profileIconId}.png`}
                      alt="icon"
                    />
                  ) : (
                    <div className={styles.suggestionIconPlaceholder}>?</div>
                  )}
                    <div className={styles.suggestionText}>
                    <div className={styles.suggestionMeta}>
                      <span className={styles.suggestionName}>{getHighlightedText(suggestion.gameName, name)}</span>
                      <span className={styles.suggestionTag}>#{suggestion.tagLine}</span>
                      {suggestion.region && (
                        <span className={styles.suggestionRegion}>{suggestion.region.toUpperCase()}</span>
                      )}
                    </div>
                    {suggestion.summonerLevel != null && (
                      <span className={styles.suggestionLevel}>Level {suggestion.summonerLevel}</span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}
