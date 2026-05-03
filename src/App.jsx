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
  const [profile, setProfile] = useState(null);
  const [puuID, setPuuID] = useState(null);
  const [summonerError, setSummonerError] = useState('');
  const [summonerLoading, setSummonerLoading] = useState(false);
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
    setProfile(null);
    setPuuID(null);
    setSummonerError('');
    navigate('/');
  };

  const handleSummonerSearch = async (username, tagLine, setError) => {
    setSummonerError('');
    setProfile(null);
    setPuuID(null);
    setSummonerLoading(true);
    try {
      const response = await apiFetch(`/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(username)}/${encodeURIComponent(tagLine)}`);
      if (!response.ok) {
        setSummonerLoading(false);
        if (response.status === 404) setError('Summoner not found. Please check the name and tag.');
        else if (response.status === 403) setError('API key invalid or expired. Please update your API key.');
        else setError('Failed to fetch summoner info. Try again later.');
        return;
      }
      const res = await response.json();
      if (!res.puuid) {
        setSummonerLoading(false);
        setError('Invalid summoner data received.');
        return;
      }
      setPuuID(res.puuid);
      let region = 'tr1';
      try {
        const shardRes = await apiFetch(`/riot/account/v1/active-shards/by-game/lol/by-puuid/${res.puuid}`);
        if (shardRes.ok) {
          const shardData = await shardRes.json();
          if (shardData.activeShard) region = shardData.activeShard;
        }
      } catch {
        // shard fetch is optional, proceed with default region
      }
      const summonerRes = await apiFetch(`/riot/lol/summoner/v4/summoners/by-puuid/${res.puuid}?region=${region}`);
      if (!summonerRes.ok) {
        setSummonerLoading(false);
        setError('Failed to fetch summoner profile info.');
        return;
      }
      const summonerData = await summonerRes.json();
      const rankRes = await apiFetch(`/riot/lol/league/v4/entries/by-puuid/${res.puuid}?region=${region}`);
      let rankText = '-';
      let entry = null;
      if (rankRes.ok) {
        const rankData = await rankRes.json();
        if (Array.isArray(rankData) && rankData.length > 0) {
          const solo = rankData.find(q => q.queueType === 'RANKED_SOLO_5x5');
          entry = solo || rankData[0];
          rankText = `${entry.tier} ${entry.rank} (${entry.leaguePoints} LP)`;
        }
      }
      const profileData = {
        name: res.gameName && res.tagLine ? `${res.gameName}#${res.tagLine}` : (summonerData.name || '-'),
        level: summonerData.summonerLevel,
        icon: summonerData.profileIconId != null ? `${summonerData.profileIconId}` : '',
        rank: rankText,
        wins: entry?.wins || 0,
        losses: entry?.losses || 0,
        tier: entry?.tier || null,
        rankDivision: entry?.rank || null,
        lp: entry?.leaguePoints || null,
        puuid: res.puuid,
        encryptedSummonerId: summonerData.id,
      };
      setProfile(profileData);
      setSummonerLoading(false);
      addRecentSearch({ gameName: res.gameName, tagLine: res.tagLine, profileIconId: summonerData.profileIconId, summonerLevel: summonerData.summonerLevel, region });
      void trackSummonerSearch(res.gameName, res.tagLine, summonerData.profileIconId, summonerData.summonerLevel, region);
      void saveRankSnapshot(profileData);
      navigate('/profile');
    } catch {
      setSummonerLoading(false);
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
        <Route path="/profile" element={<SummonerProfilePage profile={profile} puuID={puuID} error={summonerError} isLoading={summonerLoading} />} />
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
