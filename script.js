// --- Champion Guide Logic ---
function getGuides() {
  return JSON.parse(localStorage.getItem('lolapp_guides') || '[]');
}
function saveGuides(guides) {
  localStorage.setItem('lolapp_guides', JSON.stringify(guides));
}
function renderPublishedGuides() {
  const container = document.getElementById('published-guides');
  if (!container) return;
  const guides = getGuides();
  if (!guides.length) {
    container.innerHTML = '<div style="color:#b0bec5">No guides published yet.</div>';
    return;
  }
  container.innerHTML = guides.map(g => `
    <div style="background:#fff;border-radius:10px;box-shadow:0 1px 4px #e3eaf3;padding:18px 20px;margin-bottom:18px;">
      <div style="font-size:1.1em;font-weight:bold;color:#4fc3f7;margin-bottom:4px;">${g.champion} - ${g.title}</div>
      <div style="color:#789; font-size:0.98em;margin-bottom:8px;">By ${g.author || 'Anonymous'} on ${g.date}</div>
      <div style="white-space:pre-line;">${g.content}</div>
    </div>
  `).join('');
}
function setupGuideForm() {
  const form = document.getElementById('guide-form');
  if (!form) return;
  const msg = document.getElementById('guide-form-msg');
  form.onsubmit = function(e) {
    e.preventDefault();
    const champion = document.getElementById('champion-select').value;
    const title = document.getElementById('guide-title').value.trim();
    const content = document.getElementById('guide-content').value.trim();
    if (!champion || !title || !content) {
      msg.textContent = 'Please fill all fields.';
      return;
    }
    const user = getSession();
    const guides = getGuides();
    guides.unshift({
      champion,
      title,
      content,
      author: user || 'Anonymous',
      date: new Date().toLocaleString()
    });
    saveGuides(guides);
    msg.style.color = '#4fc3f7';
    msg.textContent = 'Guide published!';
    form.reset();
    renderPublishedGuides();
    setTimeout(()=>{msg.textContent='';msg.style.color='#e57373';}, 2000);
  };
}
if (document.getElementById('guide-form')) {
  setupGuideForm();
  renderPublishedGuides();
}
// --- End Champion Guide Logic ---
const summonerNames = [
    "Faker",
    "Doublelift",
    "Caps",
    "Uzi",
    "Rookie",
    "Perkz",
    "TheShy",
    "Doinb",
    "Chovy",
    "ShowMaker",
    "Karsa",
    "JackeyLove"
];
// --- Authentication Logic ---
// --- Page Structure & Authentication Logic ---
// Page containers
const pageLogin = document.getElementById('page-login');
const pageSignup = document.getElementById('page-signup');
const pageMain = document.getElementById('main-app');
// Navbar elements
const userBar = document.getElementById('user-bar');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');
function getUserBarElements() {
  // navbar may be loaded dynamically, so query each time
  const userBar = document.getElementById('user-bar');
  const userGreeting = document.getElementById('user-greeting');
  const logoutBtn = document.getElementById('logout-btn');
  return { userBar, userGreeting, logoutBtn };
}
const mainApp = document.getElementById('main-app');

function showAuth(type) {
// Simple router: show only the requested page
function showPage(page) {
    if (pageLogin) pageLogin.style.display = (page === 'login') ? '' : 'none';
    if (pageSignup) pageSignup.style.display = (page === 'signup') ? '' : 'none';
    if (pageMain) pageMain.style.display = (page === 'main') ? '' : 'none';
}

function showAuth(type) {
    loginError.textContent = '';
    signupError.textContent = '';
    if (type === 'login') {
        showPage('login');
    } else {
        showPage('signup');
    }
}

function hideAuth() {
    loginError.textContent = '';
    signupError.textContent = '';
    showPage('main');
}
}
function hideAuth() {
    authOverlay.style.display = 'none';
    loginError.textContent = '';
    signupError.textContent = '';
    if (getSession() && mainApp) mainApp.style.display = '';
    const userBar = document.getElementById('user-bar');
    if (getSession() && userBar) userBar.style.display = 'flex';
}
function setSession(username) {
    localStorage.setItem('lolapp_user', username);
}
function clearSession() {
    localStorage.removeItem('lolapp_user');
}
function getSession() {
    return localStorage.getItem('lolapp_user');
}
function getUsers() {
    return JSON.parse(localStorage.getItem('lolapp_users') || '{}');
}
function setUsers(users) {
    localStorage.setItem('lolapp_users', JSON.stringify(users));
}
// ...existing code...
// Event listeners for auth modals
if (showSignup) showSignup.onclick = e => { e.preventDefault(); showAuth('signup'); };
if (showLogin) showLogin.onclick = e => { e.preventDefault(); showAuth('login'); };
// Remove static logoutBtn event, handled in updateUIForAuth
if (loginForm) loginForm.onsubmit = function(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const users = getUsers();
    if (!users[username]) {
        loginError.textContent = 'User not found.';
        return;
    }
    if (users[username] !== password) {
        loginError.textContent = 'Incorrect password.';
        return;
    }
    setSession(username);
    updateUIForAuth();
};
if (signupForm) signupForm.onsubmit = function(e) {
    e.preventDefault();
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-password').value;
    if (!username || !password) {
        signupError.textContent = 'Please fill all fields.';
        return;
    }
    const users = getUsers();
    if (users[username]) {
        signupError.textContent = 'Username already exists.';
        return;
    }
    users[username] = password;
    setUsers(users);
    setSession(username);
    updateUIForAuth();
};

// --- Navbar Login/Logout Button Logic ---
function updateUIForAuth() {
    const user = getSession();
    const { userBar, userGreeting, logoutBtn } = getUserBarElements();
    if (userBar && userGreeting && logoutBtn) {
        userBar.style.display = 'flex';
        // Always ensure login button exists in the navbar and is appended to userBar
        let loginBtn = document.getElementById('navbar-login-btn');
        if (!loginBtn) {
            loginBtn = document.createElement('button');
            loginBtn.id = 'navbar-login-btn';
            loginBtn.textContent = 'Login';
            loginBtn.style.background = '#4fc3f7';
            loginBtn.style.color = '#fff';
            loginBtn.style.border = 'none';
            loginBtn.style.borderRadius = '8px';
            loginBtn.style.padding = '8px 22px';
            loginBtn.style.fontWeight = 'bold';
            loginBtn.style.fontSize = '1em';
            loginBtn.style.marginLeft = '12px';
            loginBtn.style.cursor = 'pointer';
            userBar.appendChild(loginBtn);
        }
        // Always set the click handler (avoid duplicate listeners)
        loginBtn.onclick = function() {
            showAuth('login');
        };
        // Remove duplicate login buttons if any
        const allLoginBtns = userBar.querySelectorAll('#navbar-login-btn');
        if (allLoginBtns.length > 1) {
            for (let i = 1; i < allLoginBtns.length; i++) {
                allLoginBtns[i].remove();
            }
        }
        if (user) {
            userGreeting.textContent = `Hello, ${user}!`;
            logoutBtn.style.display = '';
            loginBtn.style.display = 'none';
            logoutBtn.onclick = () => {
                clearSession();
                updateUIForAuth();
            };
            showPage('main');
        } else {
            userGreeting.textContent = '';
            logoutBtn.style.display = 'none';
            loginBtn.style.display = '';
            showPage('login');
        }
    }
}

window.addEventListener('DOMContentLoaded', updateUIForAuth);
// --- End Authentication Logic ---

// Create and insert the suggestion dropdown
let autocompleteList = document.createElement('ul');
autocompleteList.style.position = 'absolute';
autocompleteList.style.background = '#fff';
autocompleteList.style.border = '1px solid #ccc';
autocompleteList.style.zIndex = '1000';
autocompleteList.style.listStyle = 'none';
autocompleteList.style.padding = '0';
autocompleteList.style.margin = '0';
autocompleteList.style.width = '200px';
autocompleteList.style.display = 'none';
document.body.appendChild(autocompleteList);

const textbox = document.querySelector('.textbox');
if (textbox) {
    textbox.setAttribute('autocomplete', 'off');
    textbox.addEventListener('input', function(e) {
        const value = e.target.value.trim().toLowerCase();
        let matches = value ? summonerNames.filter(name => name.toLowerCase().includes(value)) : [];
        autocompleteList.innerHTML = '';
        if (matches.length > 0) {
            matches.forEach(name => {
                let li = document.createElement('li');
                li.textContent = name;
                li.style.padding = '8px';
                li.style.cursor = 'pointer';
                li.addEventListener('mousedown', function() {
                    textbox.value = name;
                    autocompleteList.style.display = 'none';
                });
                autocompleteList.appendChild(li);
            });
            const rect = textbox.getBoundingClientRect();
            autocompleteList.style.left = rect.left + window.scrollX + 'px';
            autocompleteList.style.top = rect.bottom + window.scrollY + 'px';
            autocompleteList.style.width = rect.width + 'px';
            autocompleteList.style.display = 'block';
        } else {
            autocompleteList.style.display = 'none';
        }
    });
    textbox.addEventListener('blur', function() {
        setTimeout(() => autocompleteList.style.display = 'none', 100);
    });
    textbox.addEventListener('focus', function(e) {
        if (textbox.value.trim()) {
            textbox.dispatchEvent(new Event('input'));
        }
    });
}
// --- End of Autocomplete for Summoner Name ---

const summonerContainer = document.getElementById('summonerContainer');
const textbox2 = document.querySelector(".textbox2");
const button = document.querySelector(".button");
const summonerName = document.querySelector(".name");
const level = document.querySelector(".level");
const profileAvatar = document.querySelector('.profile-avatar');
// Scoped profile info elements
const profileCard = document.querySelector('.profile-card');
const profileNameElem = profileCard ? profileCard.querySelector('.name') : null;
const profileLevelElem = profileCard ? profileCard.querySelector('.level') : null;
const profileRankElem = profileCard ? profileCard.querySelector('.rank-value') : null;
const api_key = "RGAPI-044798d1-59b2-40a2-ae1e-0dc82ee656d4";
let profileIconID;
let puuID;
let summonerId;
let summonerMatches;
let participants;

function showApiError(message) {
    summonerContainer.innerHTML = `<p style="color:#e57373;font-size:1.1em;margin:16px 0;">${message}</p>`;
    if (profileNameElem) profileNameElem.textContent = '-';
    if (profileLevelElem) profileLevelElem.textContent = 'Level -';
    if (profileRankElem) profileRankElem.textContent = '-';
    if (profileAvatar) profileAvatar.style.display = 'none';
}

button.addEventListener("click", async () => {
    const username = document.querySelector('.textbox').value;
    const tagLine = textbox2.value;
    await getSummonerID(username, tagLine);
});

async function getSummonerID(username, tagLine){
    try {
        // Step 1: Get PUUID from Riot ID
        const response = await fetch(`https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${username}/${tagLine}?api_key=${api_key}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7,pt;q=0.6,es;q=0.5",
                "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
                "Origin": "https://developer.riotgames.com"
            }
        });
        if (!response.ok) {
            if (response.status === 404) {
                showApiError('Summoner not found. Please check the name and tag.');
            } else if (response.status === 403) {
                showApiError('API key invalid or expired. Please update your API key.');
            } else {
                showApiError('Failed to fetch summoner info. Try again later.');
            }
            return;
        }
        const res = await response.json();
        if (!res.puuid) {
            showApiError('Invalid summoner data received.');
            return;
        }
        puuID = res.puuid;

        // Step 2: Get Summoner Info (level, icon, summonerId) from PUUID
        const summonerRes = await fetch(`https://tr1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuID}?api_key=${api_key}`);
        if (!summonerRes.ok) {
            showApiError('Failed to fetch summoner profile info.');
            return;
        }
        const summonerData = await summonerRes.json();
        // Prefer Riot ID (gameName#tagLine) if available, else fallback to summonerData.name
        if (profileNameElem) {
            if (res.gameName && res.tagLine) {
                profileNameElem.textContent = `${res.gameName}#${res.tagLine}`;
            } else {
                profileNameElem.textContent = summonerData.name || '-';
            }
        }
        if (profileLevelElem) profileLevelElem.textContent = summonerData.summonerLevel ? `Level ${summonerData.summonerLevel}` : 'Level -';
        profileIconID = summonerData.profileIconId;
        summonerId = summonerData.id;
        if (profileAvatar && profileIconID) {
            profileAvatar.src = `http://ddragon.leagueoflegends.com/cdn/10.18.1/img/profileicon/${profileIconID}.png`;
            profileAvatar.style.display = 'block';
        }

        // Step 3: Get Rank from PUUID (modern endpoint)
        const rankRes = await fetch(`https://tr1.api.riotgames.com/lol/league/v4/entries/by-puuid/${puuID}?api_key=${api_key}`);
        let rankText = '-';
        if (rankRes.ok) {
            const rankData = await rankRes.json();
            if (Array.isArray(rankData) && rankData.length > 0) {
                // Prefer solo queue rank, fallback to first entry
                const solo = rankData.find(q => q.queueType === 'RANKED_SOLO_5x5');
                const entry = solo || rankData[0];
                rankText = `${entry.tier} ${entry.rank} (${entry.leaguePoints} LP)`;
            }
        }
        if (profileRankElem) profileRankElem.textContent = rankText;

        await getMatches(puuID);
    } catch (err) {
        showApiError('Network error. Please check your connection.');
    }
}

async function getMatches(puuID){
    try {
        // Show skeleton loader for 10 matches while fetching
        let skeletonCards = '';
        for (let i = 0; i < 10; i++) {
            skeletonCards += `
                <div class="skeleton-match-card" style="margin-bottom:16px;box-shadow:0 2px 8px 0 #e3eaf3;border-radius:12px;background:#fafbfc;padding:0;overflow:hidden;">
                  <div class="match-summary" style="display:flex;align-items:center;gap:12px;padding:12px 16px 12px 16px;">
                    <div class="skeleton-avatar" style="width:48px;height:48px;background:linear-gradient(135deg,#e3eaf3 60%,#4fc3f7 100%);border-radius:8px;animation:skeleton-pulse 1.2s infinite alternate;"></div>
                    <div class="skeleton-info" style="flex:1;display:flex;flex-direction:column;gap:3px;">
                      <div style="width:90px;height:16px;background:#e3eaf3;border-radius:4px;animation:skeleton-pulse 1.2s infinite alternate;"></div>
                      <div style="width:60px;height:12px;background:#e0e7ef;border-radius:4px;animation:skeleton-pulse 1.2s infinite alternate;"></div>
                      <div style="width:120px;height:12px;background:#e3eaf3;border-radius:4px;animation:skeleton-pulse 1.2s infinite alternate;"></div>
                    </div>
                    <div class="skeleton-btn" style="width:64px;height:28px;background:linear-gradient(90deg,#e3eaf3 60%,#4fc3f7 100%);border-radius:6px;animation:skeleton-pulse 1.2s infinite alternate;"></div>
                  </div>
                  <div style="padding:0 16px 12px 16px;">
                    <div style="width:100%;height:16px;background:#e0e7ef;border-radius:6px;margin-bottom:6px;animation:skeleton-pulse 1.2s infinite alternate;"></div>
                    <div style="width:100%;height:16px;background:#e3eaf3;border-radius:6px;animation:skeleton-pulse 1.2s infinite alternate;"></div>
                  </div>
                </div>
            `;
        }
        summonerContainer.innerHTML = `
            <div class="skeleton-loader">
                ${skeletonCards}
            </div>
            <style>
            @keyframes skeleton-pulse {0%{opacity:0.6;}100%{opacity:1;}}
            .skeleton-match-card {transition:box-shadow 0.2s;}
            .skeleton-match-card:hover {box-shadow:0 4px 16px 0 #d1d5db;}
            </style>
        `;
        const response = await fetch(`https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuID}/ids?start=0&count=10&api_key=${api_key}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
                "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7,pt;q=0.6,es;q=0.5",
                "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
                "Origin": "https://developer.riotgames.com"
            }
        });
        if (!response.ok) {
            showApiError('Failed to fetch match history.');
            return;
        }
        const res = await response.json();
        if (!Array.isArray(res) || res.length === 0) {
            showApiError('No matches found for this summoner.');
            return;
        }
        summonerMatches = [...res];
        await showMatches(summonerMatches);
    } catch (err) {
        showApiError('Network error while fetching matches.');
    }
}

async function showMatches(matches){
    let matchCards = [];
    for (const matchId of matches) {
        try {
            const response = await fetch(`https://europe.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${api_key}`, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
                    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7,pt;q=0.6,es;q=0.5",
                    "Accept-Charset": "application/x-www-form-urlencoded; charset=UTF-8",
                    "Origin": "https://developer.riotgames.com"
                }
            });
            if (!response.ok) {
                continue; // skip this match
            }
            const res = await response.json();
            if (!res.info || !Array.isArray(res.info.participants)) continue;
            const participants = res.info.participants;
            // Find the current summoner's stats
            const currentSummoner = participants.find(s => s.puuid === puuID);
            // Split teams
            const team1 = participants.filter(p => p.teamId === 100);
            const team2 = participants.filter(p => p.teamId === 200);
            // Team gold
            const team1Gold = team1.reduce((sum, p) => sum + (p.goldEarned || 0), 0);
            const team2Gold = team2.reduce((sum, p) => sum + (p.goldEarned || 0), 0);
            // Team win
            const team1Win = team1[0]?.win;
            const team2Win = team2[0]?.win;
            if (currentSummoner) {
                // Calculate kill participation
                const team = currentSummoner.teamId === 100 ? team1 : team2;
                const teamKills = team.reduce((sum, p) => sum + (p.kills || 0), 0);
                const killParticipation = teamKills > 0 ? (((currentSummoner.kills + currentSummoner.assists) / teamKills) * 100).toFixed(1) : '0.0';
                // Calculate CS (creep score) and per minute
                const cs = (currentSummoner.totalMinionsKilled || 0) + (currentSummoner.neutralMinionsKilled || 0);
                const durationMinutes = res.info.gameDuration ? (res.info.gameDuration / 60) : ((res.info.gameEndTimestamp - res.info.gameStartTimestamp) / 1000 / 60);
                const csPerMin = durationMinutes > 0 ? (cs / durationMinutes).toFixed(1) : '0.0';
                matchCards.push({
                    summonerName: currentSummoner.summonerName || '',
                    championName: currentSummoner.championName,
                    kills: currentSummoner.kills,
                    deaths: currentSummoner.deaths,
                    assists: currentSummoner.assists,
                    win: currentSummoner.win,
                    gameMode: res.info.gameMode,
                    queueId: res.info.queueId,
                    kda: ((currentSummoner.kills + currentSummoner.assists) / Math.max(1, currentSummoner.deaths)).toFixed(2),
                    champIcon: `https://ddragon.leagueoflegends.com/cdn/10.18.1/img/champion/${currentSummoner.championName}.png`,
                    time: new Date(res.info.gameEndTimestamp).toLocaleString(),
                    matchId,
                    team1,
                    team2,
                    team1Gold,
                    team2Gold,
                    team1Win,
                    team2Win,
                    killParticipation,
                    cs,
                    csPerMin
                });
            }
        } catch (err) {
            // skip this match on error
            continue;
        }
    }
    if (matchCards.length === 0) {
        showApiError('Could not load any match details.');
        return;
    }
    displayMatches(matchCards);
}

function displayMatches(matches) {
    summonerContainer.innerHTML = '';
    if (!matches.length) {
        summonerContainer.innerHTML = '<p style="color:#b0bec5">No matches found.</p>';
        return;
    }
    // --- QueueId to Game Mode mapping ---
    const queueIdToMode = {
        400: 'Normal Draft',
        420: 'Ranked Solo/Duo',
        430: 'Normal Blind',
        440: 'Ranked Flex',
        450: 'ARAM',
        700: 'Clash',
        490: 'Quickplay',
        900: 'ARURF',
        1020: 'One for All',
        1400: 'Ultimate Spellbook',
        1300: 'Nexus Blitz',
        1700: 'Arena',
        1710: 'Arena',
        1810: 'Swarm',
        1820: 'Swarm',
        1830: 'Swarm',
        1840: 'Swarm',
        0: 'Custom',
    };
    matches.forEach((match, idx) => {
        const card = document.createElement('div');
        card.className = 'match-card';
        card.style.marginBottom = '16px';
        // Card background and left border color
        const bgColor = match.win ? '#e3f7fd' : '#fdeaea';
        const borderColor = match.win ? '#b3e5fc' : '#ffcdd2';
        // Use queueId if available, else fallback to gameMode
        let mode = match.queueId && queueIdToMode[match.queueId] ? queueIdToMode[match.queueId] : (match.gameMode && match.gameMode !== 'CLASSIC' ? match.gameMode : 'Classic');
        if (match.gameMode === 'CLASSIC' && (!match.queueId || !queueIdToMode[match.queueId])) {
            mode = 'Classic';
        }
        card.innerHTML = `
            <div style="position:relative;background:${bgColor};border-radius:12px;box-shadow:0 2px 8px 0 #e3eaf3;overflow:hidden;">
                <div style="position:absolute;left:0;top:0;bottom:0;width:6px;background:${borderColor};border-radius:12px 0 0 12px;"></div>
                <div class="match-summary" style="display:flex;align-items:center;cursor:pointer;padding-left:10px;">
                    <img class="champion-icon" src="${match.champIcon}" alt="${match.championName}" style="width:48px;height:48px;margin-right:12px;">
                    <div class="match-info" style="flex:1;">
                        <div><strong>${match.summonerName || '-'}<\/strong> <span style="color:${match.win ? '#4fc3f7' : '#e57373'};font-weight:600;">${match.win ? 'Win' : 'Loss'}<\/span><\/div>
                        <div class="match-stats">${match.championName} &mdash; ${match.kills}/${match.deaths}/${match.assists} KDA: <span style="color:#4fc3f7">${match.kda}<\/span><\/div>
                        <div class="match-stats">Mode: ${mode} | <span style="font-size:0.95em;">${match.time}<\/span><\/div>
                        <div class="match-stats">Kill Participation: <span style="color:#4fc3f7">${match.killParticipation}%<\/span> | CS: <span style="color:#4fc3f7">${match.cs} (${match.csPerMin})<\/span><\/div>
                    <\/div>
                    <button class="expand-btn" style="margin-left:8px;padding:4px 12px;border-radius:6px;border:none;background:#4fc3f7;color:#fff;cursor:pointer;">Details<\/button>
                <\/div>
                <div class="match-details" style="display:none;padding:16px 0 0 0;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                        <div style="font-weight:bold;color:#4fc3f7;">Blue Team${match.team1Win ? ' (Win)' : ''}<\/div>
                        <div style="font-weight:bold;color:#e57373;">Red Team${match.team2Win ? ' (Win)' : ''}<\/div>
                    <\/div>
                    <div style="display:flex;gap:24px;">
                        <table class="team-table" style="flex:1;width:100%;border-collapse:collapse;">
                            <thead><tr><th>Summoner<\/th><th>Champion<\/th><th>KDA<\/th><th>Gold<\/th><\/tr><\/thead>
                            <tbody>
                                ${match.team1.map(p => `
                                    <tr style="background:${p.puuid === puuID ? '#e3f2fd' : 'transparent'}">
                                        <td>${p.summonerName && p.summonerName !== '-' ? p.summonerName : '-'}<\/td>
                                        <td><img src="https://ddragon.leagueoflegends.com/cdn/10.18.1/img/champion/${p.championName}.png" alt="${p.championName}" style="width:24px;height:24px;vertical-align:middle;"> ${p.championName}<\/td>
                                        <td>${p.kills}/${p.deaths}/${p.assists}<\/td>
                                        <td>${p.goldEarned}<\/td>
                                    <\/tr>
                                `).join('')}
                            <\/tbody>
                            <tfoot><tr style="font-weight:bold;"><td colspan="3">Total Gold<\/td><td>${match.team1Gold}<\/td><\/tr><\/tfoot>
                        <\/table>
                        <table class="team-table" style="flex:1;width:100%;border-collapse:collapse;">
                            <thead><tr><th>Summoner<\/th><th>Champion<\/th><th>KDA<\/th><th>Gold<\/th><\/tr><\/thead>
                            <tbody>
                                ${match.team2.map(p => `
                                    <tr style="background:${p.puuid === puuID ? '#e3f2fd' : 'transparent'}">
                                        <td>${p.summonerName && p.summonerName !== '-' ? p.summonerName : '-'}<\/td>
                                        <td><img src="https://ddragon.leagueoflegends.com/cdn/10.18.1/img/champion/${p.championName}.png" alt="${p.championName}" style="width:24px;height:24px;vertical-align:middle;"> ${p.championName}<\/td>
                                        <td>${p.kills}/${p.deaths}/${p.assists}<\/td>
                                        <td>${p.goldEarned}<\/td>
                                    <\/tr>
                                `).join('')}
                            <\/tbody>
                            <tfoot><tr style="font-weight:bold;"><td colspan="3">Total Gold<\/td><td>${match.team2Gold}<\/td><\/tr><\/tfoot>
                        <\/table>
                    <\/div>
                    <div style="margin-top:12px;font-weight:bold;">Gold Difference: <span style="color:${match.team1Gold > match.team2Gold ? '#4fc3f7' : '#e57373'};">${Math.abs(match.team1Gold - match.team2Gold)}<\/span><\/div>
                    <div style="margin:10px 0 18px 0;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <span style="color:#4fc3f7;font-weight:bold;min-width:60px;">${match.team1Gold.toLocaleString()}g<\/span>
                        <div style="flex:1;height:22px;position:relative;background:#e3eaf3;border-radius:12px;overflow:hidden;min-width:120px;max-width:400px;">
                          <div style="position:absolute;left:0;top:0;bottom:0;width:${(match.team1Gold/(match.team1Gold+match.team2Gold)*100).toFixed(1)}%;background:#4fc3f7;"></div>
                          <div style="position:absolute;right:0;top:0;bottom:0;width:${(match.team2Gold/(match.team1Gold+match.team2Gold)*100).toFixed(1)}%;background:#e57373;"></div>
                        </div>
                        <span style="color:#e57373;font-weight:bold;min-width:60px;text-align:right;">${match.team2Gold.toLocaleString()}g<\/span>
                      </div>
                    </div>
                    <div class="timeline-container" style="margin-top:18px;"><\/div>
                <\/div>
            <\/div>
            <div class="match-details" style="display:none;padding:16px 0 0 0;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <div style="font-weight:bold;color:#4fc3f7;">Blue Team${match.team1Win ? ' (Win)' : ''}<\/div>
                    <div style="font-weight:bold;color:#e57373;">Red Team${match.team2Win ? ' (Win)' : ''}<\/div>
                <\/div>
                <div style="display:flex;gap:24px;">
                    <table class="team-table" style="flex:1;width:100%;border-collapse:collapse;">
                        <thead><tr><th>Summoner<\/th><th>Champion<\/th><th>KDA<\/th><th>Gold<\/th><\/tr><\/thead>
                        <tbody>
                            ${match.team1.map(p => `
                                <tr style="background:${p.puuid === puuID ? '#e3f2fd' : 'transparent'}">
                                    <td>${p.summonerName && p.summonerName !== '-' ? p.summonerName : '-'}<\/td>
                                    <td><img src="https://ddragon.leagueoflegends.com/cdn/10.18.1/img/champion/${p.championName}.png" alt="${p.championName}" style="width:24px;height:24px;vertical-align:middle;"> ${p.championName}<\/td>
                                    <td>${p.kills}/${p.deaths}/${p.assists}<\/td>
                                    <td>${p.goldEarned}<\/td>
                                <\/tr>
                            `).join('')}
                        <\/tbody>
                        <tfoot><tr style="font-weight:bold;"><td colspan="3">Total Gold<\/td><td>${match.team1Gold}<\/td><\/tr><\/tfoot>
                    <\/table>
                    <table class="team-table" style="flex:1;width:100%;border-collapse:collapse;">
                        <thead><tr><th>Summoner<\/th><th>Champion<\/th><th>KDA<\/th><th>Gold<\/th><\/tr><\/thead>
                        <tbody>
                            ${match.team2.map(p => `
                                <tr style="background:${p.puuid === puuID ? '#e3f2fd' : 'transparent'}">
                                    <td>${p.summonerName && p.summonerName !== '-' ? p.summonerName : '-'}<\/td>
                                    <td><img src="https://ddragon.leagueoflegends.com/cdn/10.18.1/img/champion/${p.championName}.png" alt="${p.championName}" style="width:24px;height:24px;vertical-align:middle;"> ${p.championName}<\/td>
                                    <td>${p.kills}/${p.deaths}/${p.assists}<\/td>
                                    <td>${p.goldEarned}<\/td>
                                <\/tr>
                            `).join('')}
                        <\/tbody>
                        <tfoot><tr style="font-weight:bold;"><td colspan="3">Total Gold<\/td><td>${match.team2Gold}<\/td><\/tr><\/tfoot>
                    <\/table>
                <\/div>
                <div style="margin-top:12px;font-weight:bold;">Gold Difference: <span style="color:${match.team1Gold > match.team2Gold ? '#4fc3f7' : '#e57373'};">${Math.abs(match.team1Gold - match.team2Gold)}<\/span><\/div>
                <div style="margin:10px 0 18px 0;">
                  <div style="display:flex;align-items:center;gap:10px;">
                    <span style="color:#4fc3f7;font-weight:bold;min-width:60px;">${match.team1Gold.toLocaleString()}g<\/span>
                    <div style="flex:1;height:22px;position:relative;background:#e3eaf3;border-radius:12px;overflow:hidden;min-width:120px;max-width:400px;">
                      <div style="position:absolute;left:0;top:0;bottom:0;width:${(match.team1Gold/(match.team1Gold+match.team2Gold)*100).toFixed(1)}%;background:#4fc3f7;"></div>
                      <div style="position:absolute;right:0;top:0;bottom:0;width:${(match.team2Gold/(match.team1Gold+match.team2Gold)*100).toFixed(1)}%;background:#e57373;"></div>
                    </div>
                    <span style="color:#e57373;font-weight:bold;min-width:60px;text-align:right;">${match.team2Gold.toLocaleString()}g<\/span>
                  </div>
                </div>
                <div class="timeline-container" style="margin-top:18px;"><\/div>
            <\/div>
        `;
        // Expand/collapse logic
        const expandBtn = card.querySelector('.expand-btn');
        const details = card.querySelector('.match-details');
        const timelineContainer = card.querySelector('.timeline-container');
        let timelineLoaded = false;
        expandBtn.addEventListener('click', async () => {
            if (details.style.display === 'none') {
                details.style.display = 'block';
                expandBtn.textContent = 'Hide';
                if (!timelineLoaded) {
                    timelineContainer.innerHTML = '<div style="color:#b0bec5">Loading timeline...</div>';
                    try {
                        const timelineRes = await fetch(`https://europe.api.riotgames.com/lol/match/v5/matches/${match.matchId}/timeline?api_key=${api_key}`);
                        if (!timelineRes.ok) throw new Error('Timeline fetch failed');
                        const timeline = await timelineRes.json();
                        // Parse events
                        const events = timeline.info && timeline.info.frames ? timeline.info.frames.flatMap(f => f.events) : [];
                        let timelineEvents = [];
                        // First blood
                        const firstBlood = events.find(e => e.type === 'CHAMPION_KILL');
                        if (firstBlood) {
                            timelineEvents.push({
                                label: 'First Blood',
                                time: firstBlood.timestamp,
                                desc: `${firstBlood.killerName || 'Unknown'} killed ${firstBlood.victimName || 'Unknown'}`,
                                icon: 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/firstblood_circle.png'
                            });
                        }
                        // Dragons/barons
                        events.filter(e => e.type === 'ELITE_MONSTER_KILL').forEach(e => {
                            let icon = '';
                            let label = '';
                            if (e.monsterType === 'DRAGON') {
                                label = `${e.monsterSubType ? e.monsterSubType.charAt(0).toUpperCase() + e.monsterSubType.slice(1).toLowerCase() : ''} Dragon`;
                                switch ((e.monsterSubType || '').toLowerCase()) {
                                    case 'infernal':
                                        icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle_fire.png';
                                        break;
                                    case 'mountain':
                                        icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle_earth.png';
                                        break;
                                    case 'ocean':
                                        icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle_water.png';
                                        break;
                                    case 'cloud':
                                        icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle_air.png';
                                        break;
                                    case 'chemtech':
                                        icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle_chemtech.png';
                                        break;
                                    case 'hextech':
                                        icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle_hextech.png';
                                        break;
                                    case 'elder':
                                        icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle.png';
                                        break;
                                    default:
                                        icon = 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/dragon_circle.png';
                                }
                                timelineEvents.push({
                                    label,
                                    time: e.timestamp,
                                    desc: `${e.killerName || 'Team'} killed Dragon`,
                                    icon
                                });
                            } else if (e.monsterType === 'BARON_NASHOR') {
                                timelineEvents.push({
                                    label: 'Baron Nashor',
                                    time: e.timestamp,
                                    desc: `${e.killerName || 'Team'} killed Baron Nashor`,
                                    icon: 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/baron_circle.png'
                                });
                            } else if (e.monsterType === 'RIFTHERALD') {
                                timelineEvents.push({
                                    label: 'Rift Herald',
                                    time: e.timestamp,
                                    desc: `${e.killerName || 'Team'} killed Rift Herald`,
                                    icon: 'https://raw.communitydragon.org/latest/game/assets/ux/announcements/sruriftherald_circle.png'
                                });
                            }
                        });
                        // Towers
                        events.filter(e => e.type === 'BUILDING_KILL' && e.buildingType === 'TOWER_BUILDING').forEach(e => {
                            timelineEvents.push({
                                label: 'Tower',
                                time: e.timestamp,
                                desc: `${e.killerName || 'Team'} destroyed a tower`,
                                icon: 'tower-sprite'
                            });
                        });
                        // Sort by time
                        timelineEvents.sort((a, b) => a.time - b.time);
                        // Timeline rendering
                        if (timelineEvents.length === 0) {
                            timelineContainer.innerHTML = '<div style="color:#b0bec5">No timeline events found.</div>';
                        } else {
                            // Get match duration in ms
                            const matchDuration = timeline.info && timeline.info.gameDuration ? timeline.info.gameDuration * 1000 : (timelineEvents[timelineEvents.length-1].time);
                            // Timeline HTML
                            let timelineHTML = `<div style="position:relative;height:60px;margin:24px 0 8px 0;">
                                <div style="position:absolute;top:28px;left:0;right:0;height:4px;background:#e3eaf3;border-radius:2px;"></div>`;
                            timelineEvents.forEach(ev => {
                                const percent = Math.min(100, Math.max(0, (ev.time / matchDuration) * 100));
                                // Format time as mm:ss
                                const totalSeconds = Math.floor(ev.time / 1000);
                                const minutes = Math.floor(totalSeconds / 60);
                                const seconds = totalSeconds % 60;
                                const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                                let iconHTML = '';
                                if (ev.icon === 'tower-sprite') {
                                    // Tower icon region in the sprite sheet (announcementicons.png)
                                    // Tower is at (0, 0) with size 64x64 in the sprite sheet
                                    iconHTML = `<span style="display:inline-block;width:32px;height:32px;background:url('https://raw.communitydragon.org/latest/game/assets/ux/announcements/announcementicons.png') no-repeat;background-size:256px 256px;background-position:0px 0px;border-radius:50%;border:2px solid #e3eaf3;background-color:#fff;filter:drop-shadow(0 2px 4px #b0bec5);"></span>`;
                                } else {
                                    iconHTML = `<img src="${ev.icon}" alt="${ev.label}" title="${ev.label} [${timeStr}]: ${ev.desc}" style="width:32px;height:32px;cursor:pointer;filter:drop-shadow(0 2px 4px #b0bec5);background:#fff;border-radius:50%;border:2px solid #e3eaf3;">`;
                                }
                                timelineHTML += `
                                    <div style="position:absolute;left:calc(${percent}% - 16px);top:0;width:32px;text-align:center;z-index:2;">
                                        ${iconHTML}
                                        <div style="font-size:0.85em;color:#789;margin-top:2px;">${timeStr}</div>
                                    </div>`;
                            });
                            timelineHTML += '</div>';
                            timelineContainer.innerHTML = timelineHTML;
                        }
                        timelineLoaded = true;
                    } catch (err) {
                        timelineContainer.innerHTML = '<div style="color:#e57373">Failed to load timeline.</div>';
                    }
                }
            } else {
                details.style.display = 'none';
                expandBtn.textContent = 'Details';
            }
        });
        summonerContainer.appendChild(card);
    });
}

