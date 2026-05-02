import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import GuidePage from './pages/GuidePage';
import LandingPage from './pages/LandingPage';
import SummonerProfilePage from './pages/SummonerProfilePage';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';

async function trackSummonerSearch(gameName, tagLine, profileIconId, summonerLevel) {
  if (!gameName || !tagLine) return;
  try {
    await fetch('/api/summoners/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName, tagLine, profileIconId, summonerLevel })
    });
  } catch {
    // ignore tracking errors
  }
}

function AppContent() {
  const { user, isLoading, logout, handleCallback } = useAuth();
  const [authModal, setAuthModal] = useState({ show: false, error: '' });
  const [page, setPage] = useState('landing');
  const [profile, setProfile] = useState(null);
  const [puuID, setPuuID] = useState(null);
  const [summonerError, setSummonerError] = useState('');

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
    setPage('landing');
    setProfile(null);
    setPuuID(null);
    setSummonerError('');
  };

  const handleNavigate = (targetPage) => setPage(targetPage);

  const handleSummonerSearch = async (username, tagLine, setError) => {
    setSummonerError('');
    setProfile(null);
    setPuuID(null);
    try {
      const response = await fetch(`/api/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(username)}/${encodeURIComponent(tagLine)}`);
      if (!response.ok) {
        if (response.status === 404) setError('Summoner not found. Please check the name and tag.');
        else if (response.status === 403) setError('API key invalid or expired. Please update your API key.');
        else setError('Failed to fetch summoner info. Try again later.');
        return;
      }
      const res = await response.json();
      if (!res.puuid) {
        setError('Invalid summoner data received.');
        return;
      }
      setPuuID(res.puuid);
      const summonerRes = await fetch(`/api/riot/lol/summoner/v4/summoners/by-puuid/${res.puuid}`);
      if (!summonerRes.ok) {
        setError('Failed to fetch summoner profile info.');
        return;
      }
      const summonerData = await summonerRes.json();
      const rankRes = await fetch(`/api/riot/lol/league/v4/entries/by-puuid/${res.puuid}`);
      let rankText = '-';
      if (rankRes.ok) {
        const rankData = await rankRes.json();
        if (Array.isArray(rankData) && rankData.length > 0) {
          const solo = rankData.find(q => q.queueType === 'RANKED_SOLO_5x5');
          const entry = solo || rankData[0];
          rankText = `${entry.tier} ${entry.rank} (${entry.leaguePoints} LP)`;
        }
      }
      setProfile({
        name: res.gameName && res.tagLine ? `${res.gameName}#${res.tagLine}` : (summonerData.name || '-'),
        level: summonerData.summonerLevel,
        icon: summonerData.profileIconId != null ? `https://ddragon.leagueoflegends.com/cdn/16.9.1/img/profileicon/${summonerData.profileIconId}.png` : '',
        rank: rankText
      });
      void trackSummonerSearch(res.gameName, res.tagLine, summonerData.profileIconId, summonerData.summonerLevel);
      setPage('profile');
    } catch {
      setError('Network error. Please check your connection.');
    }
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
      <Navbar user={displayName} onLogout={handleLogout} onShowLogin={handleShowLogin} onNavigate={handleNavigate} currentPage={page} />
      <AuthModal
        show={authModal.show}
        onClose={handleCloseAuth}
        error={authModal.error}
      />
      {page === 'landing' && <LandingPage onSearch={handleSummonerSearch} />}
      {page === 'profile' && <SummonerProfilePage profile={profile} puuID={puuID} error={summonerError} />}
      {page === 'guides' && <GuidePage />}
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
