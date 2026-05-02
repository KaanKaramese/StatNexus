
import React, { useState } from 'react';
import styles from './AuthModal.module.css';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ show, onClose, error: externalError }) {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!show) return null;

  const handleRiotLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await login();
    } catch {
      setError('Failed to start login. Please try again.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  const displayError = externalError || error;

  return (
    <div className={styles.authOverlay} onClick={handleClose}>
      <div className={styles.authModal} onClick={(e) => e.stopPropagation()}>
        <h2 className={styles.authModalTitle}>Login with Riot Games</h2>
        <p style={{ color: 'var(--muted-text)', textAlign: 'center', fontSize: '0.92rem', lineHeight: 1.5 }}>
          Link your League of Legends account to access personalized stats, save favorites, and more.
        </p>
        <button
          onClick={handleRiotLogin}
          disabled={loading}
          style={{
            marginTop: 12,
            background: '#e84057',
            color: '#fff',
            padding: '12px 32px',
            borderRadius: 8,
            fontWeight: 'bold',
            fontSize: '1.1em',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            justifyContent: 'center',
          }}
        >
          {loading ? 'Redirecting...' : 'Login with Riot Games'}
        </button>
        {displayError && <div className={styles.authError}>{displayError}</div>}
        <p className={styles.authModalText} style={{ fontSize: '0.82rem', color: 'var(--muted-text)', opacity: 0.7 }}>
          By logging in, you agree to Riot Games&apos; Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
