import React, { useState, useRef, useEffect } from 'react';
import styles from './AccountDropdown.module.css';
import { useLanguage } from '../context/LanguageContext';

const LANGUAGES = [
  { code: 'en', label: 'English', flagUrl: 'https://flagsapi.com/GB/flat/24.png' },
  { code: 'tr', label: 'Türkçe', flagUrl: 'https://flagsapi.com/TR/flat/24.png' },
  // Add more languages as needed
];

export default function AccountDropdown({ user, onLogout, onShowLogin }) {
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const dropdownRef = useRef(null);
  const langRef = useRef(null);
  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    }
    if (open || langOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, langOpen]);

  return (
    <div className={styles.accountDropdown} ref={dropdownRef}>
      <button className={styles.accountBtn} onClick={() => setOpen(v => !v)}>
        {t('account')}
        <span className={styles.caret}>▼</span>
      </button>
      {open && (
        <div className={styles.dropdownMenu}>
          {!user && (
            <button className={styles.loginBtn} onClick={onShowLogin}>
              {t('login')}
            </button>
          )}
          {user && (
            <div className={styles.userSection}>
              <span className={styles.username}>{user}</span>
              <button className={styles.logoutBtn} onClick={onLogout}>{t('logout')}</button>
            </div>
          )}
          <div className={styles.languageSection}>
            <div
              className={styles.customLangSelect}
              tabIndex={0}
              ref={langRef}
              onClick={() => setLangOpen(v => !v)}
            >
              <img
                className={styles.flag}
                src={LANGUAGES.find(l => l.code === lang).flagUrl}
                alt={LANGUAGES.find(l => l.code === lang).label + ' flag'}
              />
              <span className={styles.langLabel}>{LANGUAGES.find(l => l.code === lang).label}</span>
              <span className={styles.caret} style={{marginLeft: 6, fontSize: '0.9em'}}>▼</span>
              {langOpen && (
                <div className={styles.langDropdownMenu}>
                  {LANGUAGES.map(l => (
                    <div
                      key={l.code}
                      className={styles.langDropdownItem}
                      onClick={e => { e.stopPropagation(); setLang(l.code); setLangOpen(false); }}
                    >
                      <img
                        className={styles.flag}
                        src={l.flagUrl}
                        alt={l.label + ' flag'}
                      />
                      <span className={styles.langLabel}>{l.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className={styles.menuDivider} />
          <button className={styles.menuItem}>{t('getPremium')}</button>
          <button className={styles.menuItem}>{t('suggest')}</button>
          <button className={styles.menuItem}>{t('discord')}</button>
        </div>
      )}
    </div>
  );
}
