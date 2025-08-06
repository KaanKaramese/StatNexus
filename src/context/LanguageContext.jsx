import React, { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    welcome: 'Welcome to StatNexus',
    subtitle: 'League of Legends Summoner Search',
    home: 'Home',
    guides: 'Champion Guides',
    account: 'Account',
    login: 'Log in',
    logout: 'Logout',
    getPremium: 'Get Premium',
    suggest: 'Suggest Pro/Strm',
    discord: 'Our Discord',
    search: 'Search',
    summonerName: 'Summoner Name',
    tag: 'Tag (e.g. TR1)',
    errorNetwork: 'Network error. Please check your connection.',
    errorNotFound: 'Summoner not found. Please check the name and tag.',
    errorApi: 'API key invalid or expired. Please update your API key.',
    errorFetch: 'Failed to fetch summoner info. Try again later.',
    errorInvalid: 'Invalid summoner data received.',
    errorProfile: 'Failed to fetch summoner profile info.',
    errorTimeline: 'Failed to load timeline.',
    loadingTimeline: 'Loading timeline...',
    noTimeline: 'No timeline events found.',
    win: 'Win',
    loss: 'Loss',
    mode: 'Mode',
    kda: 'KDA',
    killParticipation: 'Kill Participation',
    cs: 'CS',
    gold: 'Gold',
    totalGold: 'Total Gold',
    recentMatches: 'Recent Matches',
    details: 'Details',
    hide: 'Hide',
    blueTeam: 'Blue Team',
    redTeam: 'Red Team',
    goldDiff: 'Gold Difference',
    firstBlood: 'First Blood',
    baron: 'Baron Nashor',
    riftHerald: 'Rift Herald',
    tower: 'Tower',
    dragon: 'Dragon',
    elderDragon: 'Elder Dragon',
    // Add more keys as needed
  },
  tr: {
    welcome: 'StatNexus\'a Hoşgeldiniz',
    subtitle: 'League of Legends Oyuncu Arama',
    home: 'Ana Sayfa',
    guides: 'Şampiyon Rehberleri',
    account: 'Hesap',
    login: 'Giriş Yap',
    logout: 'Çıkış Yap',
    getPremium: 'Premium Al',
    suggest: 'Pro/Strm Öner',
    discord: 'Discord Sunucumuz',
    search: 'Ara',
    summonerName: 'Oyuncu Adı',
    tag: 'Etiket (örn. TR1)',
    errorNetwork: 'Ağ hatası. Lütfen bağlantınızı kontrol edin.',
    errorNotFound: 'Oyuncu bulunamadı. Lütfen isim ve etiketi kontrol edin.',
    errorApi: 'API anahtarı geçersiz veya süresi dolmuş. Lütfen anahtarı güncelleyin.',
    errorFetch: 'Oyuncu bilgisi alınamadı. Daha sonra tekrar deneyin.',
    errorInvalid: 'Geçersiz oyuncu verisi alındı.',
    errorProfile: 'Oyuncu profili alınamadı.',
    errorTimeline: 'Zaman çizelgesi yüklenemedi.',
    loadingTimeline: 'Zaman çizelgesi yükleniyor...',
    noTimeline: 'Zaman çizelgesi olayı bulunamadı.',
    win: 'Galibiyet',
    loss: 'Mağlubiyet',
    mode: 'Mod',
    kda: 'KDA',
    killParticipation: 'Katkı',
    cs: 'Minyon',
    gold: 'Altın',
    totalGold: 'Toplam Altın',
    recentMatches: 'Son Maçlar',
    details: 'Detaylar',
    hide: 'Gizle',
    blueTeam: 'Mavi Takım',
    redTeam: 'Kırmızı Takım',
    goldDiff: 'Altın Farkı',
    firstBlood: 'İlk Kan',
    baron: 'Baron Nashor',
    riftHerald: 'Vadinin Alameti',
    tower: 'Kule',
    dragon: 'Ejder',
    elderDragon: 'Kadim Ejder',
    // Add more keys as needed
  }
};

const LanguageContext = createContext({
  lang: 'en',
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');
  const t = (key) => translations[lang][key] || key;
  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
