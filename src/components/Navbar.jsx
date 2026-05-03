import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import logo from '../assets/StatNexusLogo.png';
import styles from './Navbar.module.css';
import AccountDropdown from './AccountDropdown';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar({ user, onLogout, onShowLogin }) {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const homeRef = useRef(null);
  const guidesRef = useRef(null);
  const navRef = useRef(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });
  const [hovered, setHovered] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const currentPage = location.pathname === '/' ? 'landing' : location.pathname.slice(1);

  const handleNavigate = (target) => {
    setMenuOpen(false);
    navigate(target === 'landing' ? '/' : `/${target}`);
  };

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handler);
      document.body.classList.add('menu-open');
    }
    return () => {
      document.removeEventListener('mousedown', handler);
      document.body.classList.remove('menu-open');
    };
  }, [menuOpen]);

  // Close menu on escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [menuOpen]);

  // Update underline position
  const updateUnderline = (target) => {
    if (target) {
      setUnderline({ left: target.offsetLeft, width: target.offsetWidth });
    }
  };

  useEffect(() => {
    if (hovered === 'home') {
      updateUnderline(homeRef.current);
    } else if (hovered === 'guides') {
      updateUnderline(guidesRef.current);
    } else {
      if (currentPage === 'landing') {
        updateUnderline(homeRef.current);
      } else if (currentPage === 'guides') {
        updateUnderline(guidesRef.current);
      }
    }
  }, [currentPage, hovered]);

  return (
    <nav className={styles.mainNavbar} ref={navRef}>
      <div className={styles.navScaleWrap}>
      <div className={styles.navbarContent}>
        <button
          className={styles.navbarLogo}
          onClick={() => handleNavigate('landing')}
          aria-label="StatNexus Home"
        >
          <img src={logo} alt="StatNexus Logo" className={styles.logoImg} />
        </button>

        <ul className={`${styles.navbarLinks} ${menuOpen ? styles.navbarLinksOpen : ''}`}>
          <li>
            <button
              ref={homeRef}
              className={currentPage === 'landing' ? `${styles.navbarLink} ${styles.navbarLinkActive}` : styles.navbarLink}
              onClick={() => handleNavigate('landing')}
              onMouseEnter={() => setHovered('home')}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered('home')}
              onBlur={() => setHovered(null)}
            >
              {t('home')}
            </button>
          </li>
          <li className={styles.navbarDivider} />
          <li>
            <button
              ref={guidesRef}
              className={currentPage === 'guides' ? `${styles.navbarLink} ${styles.navbarLinkActive}` : styles.navbarLink}
              onClick={() => handleNavigate('guides')}
              onMouseEnter={() => setHovered('guides')}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered('guides')}
              onBlur={() => setHovered(null)}
            >
              {t('guides')}
            </button>
          </li>
          <div
            className={styles.navbarUnderline}
            style={{
              left: underline.left,
              width: underline.width,
            }}
          />
        </ul>

        <div className={styles.rightGroup}>
          <div className={styles.userBar}>
            <AccountDropdown user={user} onLogout={onLogout} onShowLogin={onShowLogin} />
          </div>
          <button
            className={styles.navbarToggle}
            onClick={() => setMenuOpen(v => !v)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <span className={`${styles.navbarToggleBar} ${menuOpen ? styles.barTop : ''}`} />
            <span className={`${styles.navbarToggleBar} ${menuOpen ? styles.barMid : ''}`} />
            <span className={`${styles.navbarToggleBar} ${menuOpen ? styles.barBot : ''}`} />
          </button>
        </div>
        </div>
      </div>
        {menuOpen && <div className={styles.navbarOverlay} onClick={() => setMenuOpen(false)} />}
      </nav>
  );
}
