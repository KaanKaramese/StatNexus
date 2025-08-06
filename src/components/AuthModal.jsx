

import React from 'react';
import styles from './AuthModal.module.css';

export default function AuthModal({ show, type, onClose, onLogin, onSignup, error }) {
  if (!show) return null;
  return (
    <div className={styles.authOverlay}>
      <div className={styles.authModal} style={{display: type==='login' ? '' : 'none'}}>
        <h2 className={styles.authModalTitle}>Login</h2>
        <form className={styles.authModalForm} onSubmit={onLogin}>
          <input className={styles.authModalInput} type="text" id="login-username" placeholder="Username" required autoComplete="username" />
          <input className={styles.authModalInput} type="password" id="login-password" placeholder="Password" required autoComplete="current-password" />
          <button className={styles.authModalButton} type="submit">Login</button>
        </form>
        <button style={{marginTop:12,background:'#e84057',color:'#fff',padding:'10px 24px',borderRadius:8,fontWeight:'bold',display:'block',width:'100%',border:'none',cursor:'pointer',fontSize:'1.08em'}}>Login with Riot</button>
        <p className={styles.authModalText}>Don't have an account? <a className={styles.authModalLink} href="#" onClick={e=>{e.preventDefault();onClose('signup')}}>Sign up</a></p>
        <div className={styles.authError}>{type==='login' && error}</div>
      </div>
      <div className={styles.authModal} style={{display: type==='signup' ? '' : 'none'}}>
        <h2 className={styles.authModalTitle}>Sign Up</h2>
        <form className={styles.authModalForm} onSubmit={onSignup}>
          <input className={styles.authModalInput} type="text" id="signup-username" placeholder="Username" required autoComplete="username" />
          <input className={styles.authModalInput} type="password" id="signup-password" placeholder="Password" required autoComplete="new-password" />
          <button className={styles.authModalButton} type="submit">Sign Up</button>
        </form>
        <p className={styles.authModalText}>Already have an account? <a className={styles.authModalLink} href="#" onClick={e=>{e.preventDefault();onClose('login')}}>Login</a></p>
        <div className={styles.authError}>{type==='signup' && error}</div>
      </div>
    </div>
  );
}
