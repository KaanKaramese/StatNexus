
import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthModal from './components/AuthModal';
import MainApp from './pages/MainApp';
import GuidePage from './pages/GuidePage';
import LandingPage from './pages/LandingPage';
import SummonerProfilePage from './pages/SummonerProfilePage';
import { LanguageProvider } from './context/LanguageContext';

function getSession() {
  return localStorage.getItem('lolapp_user');
}
function setSession(username) {
  localStorage.setItem('lolapp_user', username);
}
function clearSession() {
  localStorage.removeItem('lolapp_user');
}
function getUsers() {
  return JSON.parse(localStorage.getItem('lolapp_users') || '{}');
}
function setUsers(users) {
  localStorage.setItem('lolapp_users', JSON.stringify(users));
}

export default function App() {
  const [user, setUser] = useState(getSession());
  const [authModal, setAuthModal] = useState({ show: false, type: 'login', error: '' });
  const [page, setPage] = useState('landing'); // 'landing', 'profile', 'guides'
  const [profile, setProfile] = useState(null);
  const [puuID, setPuuID] = useState(null);
  const [summonerError, setSummonerError] = useState('');

  useEffect(() => {
    setUser(getSession());
  }, []);

  const handleShowLogin = () => setAuthModal({ show: true, type: 'login', error: '' });
  const handleCloseAuth = (type) => setAuthModal({ show: true, type, error: '' });
  const handleLogout = () => {
    clearSession();
    setUser(null);
    setAuthModal({ show: false, type: 'login', error: '' });
    setPage('landing');
    setProfile(null);
    setPuuID(null);
    setSummonerError('');
  };
  const handleLogin = (e) => {
    e.preventDefault();
    const username = e.target[0].value.trim();
    const password = e.target[1].value;
    const users = getUsers();
    if (!users[username]) {
      setAuthModal(m => ({ ...m, error: 'User not found.' }));
      return;
    }
    if (users[username] !== password) {
      setAuthModal(m => ({ ...m, error: 'Incorrect password.' }));
      return;
    }
    setSession(username);
    setUser(username);
    setAuthModal({ show: false, type: 'login', error: '' });
    setPage('landing');
  };
  const handleSignup = (e) => {
    e.preventDefault();
    const username = e.target[0].value.trim();
    const password = e.target[1].value;
    if (!username || !password) {
      setAuthModal(m => ({ ...m, error: 'Please fill all fields.' }));
      return;
    }
    const users = getUsers();
    if (users[username]) {
      setAuthModal(m => ({ ...m, error: 'Username already exists.' }));
      return;
    }
    users[username] = password;
    setUsers(users);
    setSession(username);
    setUser(username);
    setAuthModal({ show: false, type: 'login', error: '' });
  };

  // SPA navigation handler
  const handleNavigate = (targetPage) => setPage(targetPage);

  // Summoner search logic (used by LandingPage)
  const handleSummonerSearch = async (username, tagLine, setError) => {
    setSummonerError('');
    setProfile(null);
    setPuuID(null);
    try {
      // Step 1: Get PUUID from Riot ID
      const response = await fetch(`https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${username}/${tagLine}?api_key=RGAPI-044798d1-59b2-40a2-ae1e-0dc82ee656d4`);
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
      // Step 2: Get Summoner Info (level, icon, summonerId) from PUUID
      const summonerRes = await fetch(`https://tr1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${res.puuid}?api_key=RGAPI-044798d1-59b2-40a2-ae1e-0dc82ee656d4`);
      if (!summonerRes.ok) {
        setError('Failed to fetch summoner profile info.');
        return;
      }
      const summonerData = await summonerRes.json();
      // Step 3: Get Rank from PUUID
      const rankRes = await fetch(`https://tr1.api.riotgames.com/lol/league/v4/entries/by-puuid/${res.puuid}?api_key=RGAPI-044798d1-59b2-40a2-ae1e-0dc82ee656d4`);
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
        icon: summonerData.profileIconId ? `http://ddragon.leagueoflegends.com/cdn/10.18.1/img/profileicon/${summonerData.profileIconId}.png` : '',
        rank: rankText
      });
      setPage('profile');
    } catch {
      setError('Network error. Please check your connection.');
    }
  };

  return (
    <LanguageProvider>
      <Navbar user={user} onLogout={handleLogout} onShowLogin={handleShowLogin} onNavigate={handleNavigate} currentPage={page} />
      <AuthModal
        show={authModal.show}
        type={authModal.type}
        onClose={handleCloseAuth}
        onLogin={handleLogin}
        onSignup={handleSignup}
        error={authModal.error}
      />
      {user ? (
        page === 'guides' ? <GuidePage /> : null
      ) : (
        page === 'landing' ? <LandingPage onSearch={handleSummonerSearch} /> :
        page === 'profile' ? <SummonerProfilePage profile={profile} puuID={puuID} error={summonerError} /> :
        page === 'guides' ? <GuidePage /> : null
      )}
    </LanguageProvider>
  );
}
