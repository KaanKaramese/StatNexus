const STORAGE_KEY = 'statnexus_recent_searches';
const MAX_RECENT = 5;

export function getRecentSearches() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch({ gameName, tagLine, profileIconId, summonerLevel, region }) {
  if (!gameName || !tagLine) return;
  const searches = getRecentSearches();
  const filtered = searches.filter(
    s => !(s.gameName.toLowerCase() === gameName.toLowerCase() && s.tagLine.toLowerCase() === tagLine.toLowerCase())
  );
  filtered.unshift({
    gameName,
    tagLine,
    profileIconId: profileIconId ?? null,
    summonerLevel: summonerLevel ?? null,
    region: region ?? null,
    searchedAt: Date.now(),
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
}

export function removeRecentSearch(gameName, tagLine) {
  const searches = getRecentSearches();
  const filtered = searches.filter(
    s => !(s.gameName.toLowerCase() === gameName.toLowerCase() && s.tagLine.toLowerCase() === tagLine.toLowerCase())
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function clearRecentSearches() {
  localStorage.removeItem(STORAGE_KEY);
}
