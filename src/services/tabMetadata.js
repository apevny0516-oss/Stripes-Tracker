// Local metadata storage for tab genres and other custom data
// This is stored in localStorage since we can't write to Google Drive

const METADATA_KEY = 'tabVaultMetadata';
const GENRES_KEY = 'tabVaultGenres';

// Default genres for guitar tabs
const DEFAULT_GENRES = [
  'Acoustic',
  'Blues',
  'Country',
  'Hip-Hop/Rap',
  'Jazz/Funk/Fusion',
  'Metal',
  'Pop',
  'R&B',
  'Rock',
];

/**
 * Get all available genres
 */
export function getGenres() {
  const stored = localStorage.getItem(GENRES_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return DEFAULT_GENRES;
    }
  }
  return DEFAULT_GENRES;
}

/**
 * Save genres list
 */
export function saveGenres(genres) {
  localStorage.setItem(GENRES_KEY, JSON.stringify(genres));
}

/**
 * Add a new genre
 */
export function addGenre(genre) {
  const genres = getGenres();
  if (!genres.includes(genre)) {
    genres.push(genre);
    genres.sort((a, b) => a.localeCompare(b));
    saveGenres(genres);
  }
  return genres;
}

/**
 * Remove a genre
 */
export function removeGenre(genre) {
  const genres = getGenres().filter(g => g !== genre);
  saveGenres(genres);
  return genres;
}

/**
 * Get all tab metadata
 */
export function getAllMetadata() {
  const stored = localStorage.getItem(METADATA_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      return {};
    }
  }
  return {};
}

/**
 * Get metadata for a specific tab
 */
export function getTabMetadata(tabId) {
  const all = getAllMetadata();
  return all[tabId] || { genres: [] };
}

/**
 * Set metadata for a specific tab
 */
export function setTabMetadata(tabId, metadata) {
  const all = getAllMetadata();
  all[tabId] = { ...all[tabId], ...metadata };
  localStorage.setItem(METADATA_KEY, JSON.stringify(all));
}

/**
 * Toggle genre for a tab
 */
export function toggleTabGenre(tabId, genre) {
  const metadata = getTabMetadata(tabId);
  if (!metadata.genres) metadata.genres = [];
  
  if (metadata.genres.includes(genre)) {
    metadata.genres = metadata.genres.filter(g => g !== genre);
  } else {
    metadata.genres.push(genre);
  }
  setTabMetadata(tabId, metadata);
  return metadata.genres;
}

/**
 * Get all tabs with a specific genre
 */
export function getTabsByGenre(genre) {
  const all = getAllMetadata();
  return Object.entries(all)
    .filter(([_, meta]) => meta.genres?.includes(genre))
    .map(([id]) => id);
}

export { DEFAULT_GENRES };
