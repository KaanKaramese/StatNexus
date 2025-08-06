

import React, { useRef, useState, useEffect } from 'react';
import logo from '../assets/StatNexusLogo.png';
import styles from './Navbar.module.css';
import AccountDropdown from './AccountDropdown';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar({ user, onLogout, onShowLogin, onNavigate, currentPage }) {
  const { t } = useLanguage();
  const homeRef = useRef(null);
  const guidesRef = useRef(null);
  const [underline, setUnderline] = useState({ left: 0, width: 0 });
  const [hovered, setHovered] = useState(null); // 'home' | 'guides' | null

  // Helper to update underline position/width
  const updateUnderline = (target) => {
    if (target) {
      const rect = target.getBoundingClientRect();
      const parentRect = target.parentElement.parentElement.getBoundingClientRect();
      setUnderline({ left: rect.left - parentRect.left, width: rect.width });
    }
  };

  // On mount and when currentPage/hovered changes, update underline
  useEffect(() => {
    if (hovered === 'home') {
      updateUnderline(homeRef.current);
    } else if (hovered === 'guides') {
      updateUnderline(guidesRef.current);
    } else {
      // Default to active
      if (currentPage === 'landing' || currentPage === 'main') {
        updateUnderline(homeRef.current);
      } else if (currentPage === 'guides') {
        updateUnderline(guidesRef.current);
      }
    }
  }, [currentPage, hovered]);

  return (
    <nav className={styles.mainNavbar}>
      <div className={styles.navbarContent} style={{position:'relative'}}>
        <div className={styles.leftGroup}>
          <button
            className={styles.navbarLogo}
            style={{display:'flex',alignItems:'center',justifyContent:'flex-start',textDecoration:'none',marginRight:24,background:'none',border:'none',padding:0,cursor:'pointer'}}
            onClick={() => onNavigate('landing')}
          >
            <img src={logo} alt="StatNexus Logo" style={{height:200,width:200,display:'block'}} />
          </button>
          <ul className={styles.navbarLinks} style={{position:'relative'}}>
            <li>
              <button
                ref={homeRef}
                className={currentPage === 'landing' || currentPage === 'main' ? `${styles.navbarLink} ${styles.navbarLinkActive}` : styles.navbarLink}
                style={{background:'none',border:'none',padding:0,cursor:'pointer'}}
                onClick={()=>onNavigate('landing')}
                onMouseEnter={()=>setHovered('home')}
                onMouseLeave={()=>setHovered(null)}
                onFocus={()=>setHovered('home')}
                onBlur={()=>setHovered(null)}
              >
              {t('home')}
              </button>
            </li>
            <li>
              <button
                ref={guidesRef}
                className={currentPage === 'guides' ? `${styles.navbarLink} ${styles.navbarLinkActive}` : styles.navbarLink}
                style={{background:'none',border:'none',padding:0,cursor:'pointer'}}
                onClick={()=>onNavigate('guides')}
                onMouseEnter={()=>setHovered('guides')}
                onMouseLeave={()=>setHovered(null)}
                onFocus={()=>setHovered('guides')}
                onBlur={()=>setHovered(null)}
              >
              {t('guides')}
              </button>
            </li>
            {/* Underline element */}
            <div
              className={styles.navbarUnderline}
              style={{
                left: underline.left,
                width: underline.width,
                height: 4,
                position: 'absolute',
                bottom: -6,
                background: 'var(--primary-accent)',
                borderRadius: '2px 2px 0 0',
                transition: 'left 0.25s cubic-bezier(.4,0,.2,1), width 0.25s cubic-bezier(.4,0,.2,1)',
                pointerEvents: 'none',
                zIndex: 2
              }}
            />
          </ul>
        </div>
        <div id="user-bar" className={styles.userBar} style={{background:'none',boxShadow:'none',padding:0,marginLeft:'auto'}}>
          <AccountDropdown user={user} onLogout={onLogout} onShowLogin={onShowLogin} />
        </div>
      </div>
    </nav>
  );
}
