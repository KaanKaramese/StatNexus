// Riot OAuth2 minimal backend (Node.js/Express)
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3001;

// Replace with your Riot OAuth2 credentials
const CLIENT_ID = process.env.RIOT_CLIENT_ID || 'YOUR_CLIENT_ID';
const CLIENT_SECRET = process.env.RIOT_CLIENT_SECRET || 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = process.env.RIOT_REDIRECT_URI || 'http://localhost:3001/callback';

// Step 1: Redirect user to Riot login
app.get('/login', (req, res) => {
  const authUrl = `https://auth.riotgames.com/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=openid+offline_access+cpid`;
  res.redirect(authUrl);
});

// Step 2: Handle Riot callback and exchange code for token
app.get('/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');
  try {
    const tokenRes = await axios.post('https://auth.riotgames.com/token', new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const { access_token, id_token, refresh_token } = tokenRes.data;
    // Step 3: Get user info
    const userRes = await axios.get('https://auth.riotgames.com/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    // For demo: send user info and tokens to frontend (in production, use a session/cookie)
    res.json({ user: userRes.data, access_token, id_token, refresh_token });
  } catch (err) {
    res.status(500).send('OAuth2 Error: ' + (err.response?.data?.error_description || err.message));
  }
});

app.listen(PORT, () => {
  console.log(`Riot OAuth2 backend running on http://localhost:${PORT}`);
});
