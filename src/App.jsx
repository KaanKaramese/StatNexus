import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import GuidePage from './pages/GuidePage';
import LandingPage from './pages/LandingPage';
import SummonerProfilePage from './pages/SummonerProfilePage';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { apiFetch } from './api';
import { initAll } from './utils/ddragon';
import { addRecentSearch } from './utils/recentSearches';

async function trackSummonerSearch(gameName, tagLine, profileIconId, summonerLevel, region) {
  if (!gameName || !tagLine) return;
  try {
    await apiFetch('/summoners/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName, tagLine, profileIconId, summonerLevel, region })
    });
  } catch {
    // ignore tracking errors
  }
}

async function saveRankSnapshot(profileData) {
  if (!profileData?.puuid || !profileData?.tier) return;
  try {
    const res = await apiFetch('/summoners/rank-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        puuid: profileData.puuid,
        tier: profileData.tier,
        rankDivision: profileData.rankDivision,
        leaguePoints: profileData.lp,
        wins: profileData.wins,
        losses: profileData.losses,
      })
    });
    if (!res.ok) console.error('saveRankSnapshot failed:', res.status, await res.text());
  } catch (err) {
    console.error('saveRankSnapshot error:', err);
  }
}

function AppContent() {
  const { user, isLoading, logout, handleCallback } = useAuth();
  const [authModal, setAuthModal] = useState({ show: false, error: '' });
  const navigate = useNavigate();

  useEffect(() => {
    initAll();
  }, []);

  // Handle OAuth callback from Riot redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code) {
      handleCallback(code, state).then((success) => {
        // Clean up URL
        const url = new URL(window.location);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, '', url.toString());

        if (!success) {
          setAuthModal({ show: true, error: 'Login failed. Please try again.' });
        }
      });
    }
  }, [handleCallback]);

  const handleShowLogin = () => setAuthModal({ show: true, error: '' });
  const handleCloseAuth = () => setAuthModal({ show: false, error: '' });

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSummonerSearch = (username, tagLine) => {
    navigate(
      `/summoner/${encodeURIComponent(username)}/${encodeURIComponent(tagLine)}`,
      { replace: true }
    );
  };

  const handleSearchSuccess = ({ gameName, tagLine, profileIconId, summonerLevel, region, profileData }) => {
    addRecentSearch({ gameName, tagLine, profileIconId, summonerLevel, region });
    trackSummonerSearch(gameName, tagLine, profileIconId, summonerLevel, region);
    saveRankSnapshot(profileData);
  };

  if (isLoading) {
    return (
      <LanguageProvider>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          <span style={{ color: 'var(--muted-text)' }}>Loading...</span>
        </div>
      </LanguageProvider>
    );
  }

  const displayName = user ? `${user.gameName}#${user.tagLine}` : null;

  return (
    <LanguageProvider>
      <Navbar
        user={displayName}
        onLogout={handleLogout}
        onShowLogin={handleShowLogin}
      />
      <AuthModal
        show={authModal.show}
        onClose={handleCloseAuth}
        error={authModal.error}
      />
      <Routes>
        <Route path="/" element={<LandingPage onSearch={handleSummonerSearch} />} />
        <Route path="/summoner/by-puuid/:puuid" element={
          <SummonerProfilePage onSearchSuccess={handleSearchSuccess} />
        } />
        <Route path="/summoner/:gameName/:tagLine" element={
          <SummonerProfilePage onSearchSuccess={handleSearchSuccess} />
        } />
        <Route path="/guides" element={<GuidePage />} />
      </Routes>
    </LanguageProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
