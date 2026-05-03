
import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import styles from './SummonerSearch.module.css';
import { apiFetch } from '../api';
import { profileIcon } from '../utils/ddragon';
import { getRecentSearches, removeRecentSearch, clearRecentSearches } from '../utils/recentSearches';

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

  const [recentSearches, setRecentSearches] = useState([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);
  const [activeRecentIndex, setActiveRecentIndex] = useState(-1);

  const refreshRecentSearches = () => {
    const recents = getRecentSearches();
    setRecentSearches(recents);
    return recents;
  };

  useEffect(() => {
    refreshRecentSearches();
  }, []);

  const handleInput = e => {
    const value = e.target.value;
    setName(value);
    setActiveIndex(-1);
    if (value.trim()) {
      setShowSuggestions(true);
      setShowRecentSearches(false);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
      const recents = refreshRecentSearches();
      if (recents.length > 0) setShowRecentSearches(true);
    }
  };

  const handleSuggestionClick = suggestion => {
    setName(suggestion.gameName);
    setTag(suggestion.tagLine);
    setShowSuggestions(false);
    setActiveIndex(-1);
  };

  const handleRecentSearchClick = recent => {
    setName(recent.gameName);
    setTag(recent.tagLine);
    setShowRecentSearches(false);
    setActiveRecentIndex(-1);
    onSearch(recent.gameName, recent.tagLine);
  };

  const handleRemoveRecent = (e, gameName, tagLine) => {
    e.stopPropagation();
    removeRecentSearch(gameName, tagLine);
    const updated = refreshRecentSearches();
    if (updated.length === 0) {
      setShowRecentSearches(false);
    }
    setActiveRecentIndex(-1);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
    setShowRecentSearches(false);
    setActiveRecentIndex(-1);
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
    if (showRecentSearches && recentSearches.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveRecentIndex((current) => Math.min(current + 1, recentSearches.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveRecentIndex((current) => Math.max(current - 1, 0));
      } else if (e.key === 'Enter' && activeRecentIndex >= 0 && activeRecentIndex < recentSearches.length) {
        e.preventDefault();
        handleRecentSearchClick(recentSearches[activeRecentIndex]);
      } else if (e.key === 'Escape') {
        setShowRecentSearches(false);
        setActiveRecentIndex(-1);
      }
      return;
    }

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

  const showRecentDropdown = showRecentSearches && recentSearches.length > 0;
  const showSuggestionDropdown = showSuggestions && (loadingSuggestions || suggestionsError || suggestions.length > 0);
  const showDropdown = showRecentDropdown || showSuggestionDropdown;

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
          onBlur={() => setTimeout(() => {
            setShowSuggestions(false);
            setShowRecentSearches(false);
            setActiveRecentIndex(-1);
          }, 100)}
          onFocus={() => {
            if (name) {
              setShowSuggestions(true);
              setShowRecentSearches(false);
            } else {
              const recents = refreshRecentSearches();
              if (recents.length > 0) {
                setShowRecentSearches(true);
              }
              setShowSuggestions(false);
            }
          }}
        />
        <input type="text" className={styles.textbox2} placeholder={t('tag')} value={tag} onChange={e => setTag(e.target.value)} />
        <button className={styles.button} type="submit">{t('search')}</button>
        {showDropdown && (
          <ul className={styles.autocompleteList}>
            {showRecentDropdown ? (
              <>
                <li className={`${styles.autocompleteItem} ${styles.recentHeader}`}>
                  <span>{t('recentlySearched')}</span>
                  <button
                    className={styles.clearButton}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={handleClearRecent}
                    type="button"
                  >
                    {t('clear')}
                  </button>
                </li>
                {recentSearches.map((recent, index) => (
                  <li
                    key={`${recent.gameName}#${recent.tagLine}`}
                    className={`${styles.autocompleteItem} ${index === activeRecentIndex ? styles.autocompleteItemActive : ''}`}
                    onMouseDown={() => handleRecentSearchClick(recent)}
                    onMouseEnter={() => setActiveRecentIndex(index)}
                  >
                    <div className={styles.suggestionRow}>
                      {recent.profileIconId != null ? (
                        <img
                          className={styles.suggestionIcon}
                          src={profileIcon(recent.profileIconId) || ''}
                          alt="icon"
                        />
                      ) : (
                        <div className={styles.suggestionIconPlaceholder}>?</div>
                      )}
                      <div className={styles.suggestionText}>
                        <div className={styles.suggestionMeta}>
                          <span className={styles.suggestionName}>{recent.gameName}</span>
                          <span className={styles.suggestionTag}>#{recent.tagLine}</span>
                          {recent.region && (
                            <span className={styles.suggestionRegion}>{recent.region.toUpperCase()}</span>
                          )}
                        </div>
                        {recent.summonerLevel != null && (
                          <span className={styles.suggestionLevel}>Level {recent.summonerLevel}</span>
                        )}
                      </div>
                      <button
                        className={styles.removeButton}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => handleRemoveRecent(e, recent.gameName, recent.tagLine)}
                        type="button"
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </>
            ) : (
              <>
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
                          src={profileIcon(suggestion.profileIconId) || ''}
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
              </>
            )}
          </ul>
        )}
      </div>
    </form>
  );
}
