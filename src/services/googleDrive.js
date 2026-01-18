// Google Drive API configuration
// You'll need to create credentials at https://console.cloud.google.com/
const CLIENT_ID = '248072390735-o9f123fnhp6u5cilvvrtbinejv5mmner.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBTpumOlpwDe63DPRElZkH3RKfmsXG11M0';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// Your root folder ID from the URL
const ROOT_FOLDER_ID = '1faim3IFST9upzuBMQjVVMFjHRBNt7pIB';

let tokenClient;
let gapiInited = false;
let gisInited = false;

// Concurrency limit to avoid rate limiting
const BATCH_SIZE = 10;

/**
 * Initialize the Google API client
 */
export async function initializeGapi() {
  return new Promise((resolve, reject) => {
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Initialize the Google Identity Services client
 */
export function initializeGis(onTokenResponse) {
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: onTokenResponse,
  });
  gisInited = true;
}

/**
 * Request access token
 */
export function requestAccessToken() {
  if (gisInited && tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' });
  }
}

/**
 * Check if user is signed in
 */
export function isSignedIn() {
  return window.gapi?.client?.getToken() !== null;
}

/**
 * Sign out
 */
export function signOut() {
  const token = window.gapi.client.getToken();
  if (token !== null) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken('');
  }
}

/**
 * List all folders in a given parent folder
 */
export async function listFolders(parentId = ROOT_FOLDER_ID) {
  try {
    const response = await window.gapi.client.drive.files.list({
      q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      orderBy: 'name',
      pageSize: 1000,
    });
    return response.result.files || [];
  } catch (error) {
    console.error('Error listing folders:', error);
    return [];
  }
}

/**
 * List all files (non-folders) in a given folder
 */
export async function listFiles(folderId) {
  try {
    const response = await window.gapi.client.drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name, mimeType)',
      orderBy: 'name',
      pageSize: 100,
    });
    return response.result.files || [];
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
}

/**
 * Process items in batches with concurrency limit
 */
async function processBatch(items, processor, batchSize = BATCH_SIZE) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Categorize a file by extension
 */
function categorizeFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) {
    return {
      type: 'pdf',
      data: {
        id: file.id,
        name: file.name,
        link: `https://drive.google.com/file/d/${file.id}/view`,
      }
    };
  } else if (name.endsWith('.gp') || name.endsWith('.gpx') ||
             name.endsWith('.gp5') || name.endsWith('.gp4') ||
             name.endsWith('.gp3')) {
    return {
      type: 'gp',
      data: {
        id: file.id,
        name: file.name,
        link: `https://drive.google.com/file/d/${file.id}/view`,
      }
    };
  }
  return null;
}

/**
 * Load files for a single song folder - checks direct files and ALL subfolders
 * Handles separate GP/PDF folders or combined folders
 */
async function loadSongFiles(songId) {
  const files = { pdf: null, gp: null };
  
  // Get direct files in song folder
  const directFiles = await listFiles(songId);
  
  for (const file of directFiles) {
    const cat = categorizeFile(file);
    if (cat && !files[cat.type]) {
      files[cat.type] = cat.data;
    }
    // Early exit if we found both
    if (files.pdf && files.gp) return files;
  }
  
  // Check ALL subfolders for missing file types
  if (!files.pdf || !files.gp) {
    const subFolders = await listFolders(songId);
    
    // Search all subfolders in parallel for efficiency
    if (subFolders.length > 0) {
      const subFolderResults = await Promise.all(
        subFolders.map(folder => listFiles(folder.id))
      );
      
      // Process results from all subfolders
      for (const subFiles of subFolderResults) {
        for (const file of subFiles) {
          const cat = categorizeFile(file);
          if (cat && !files[cat.type]) {
            files[cat.type] = cat.data;
          }
          // Exit early if we found both
          if (files.pdf && files.gp) return files;
        }
      }
    }
  }
  
  return files;
}

/**
 * Get library structure with progressive loading
 * onProgress callback receives partial results as they load
 */
export async function getLibraryStructure(onProgress = null) {
  // Get all artist folders first
  const artistFolders = await listFolders(ROOT_FOLDER_ID);
  console.log(`Found ${artistFolders.length} artists`);
  
  const library = { artists: [] };
  
  // Load all song folders for all artists in parallel batches
  const artistsWithSongs = await processBatch(artistFolders, async (artist) => {
    const songFolders = await listFolders(artist.id);
    return {
      id: artist.id,
      name: artist.name,
      songFolders: songFolders,
    };
  }, BATCH_SIZE);
  
  // Build initial structure with empty files (fast)
  for (const artist of artistsWithSongs) {
    const artistData = {
      id: artist.id,
      name: artist.name,
      songs: artist.songFolders.map(song => ({
        id: song.id,
        name: song.name,
        artistId: artist.id,
        artistName: artist.name,
        files: { pdf: null, gp: null, other: [] },
        loading: true,
      })),
    };
    artistData.songs.sort((a, b) => a.name.localeCompare(b.name));
    library.artists.push(artistData);
  }
  
  library.artists.sort((a, b) => a.name.localeCompare(b.name));
  
  // Send initial structure immediately
  if (onProgress) {
    onProgress({ ...library, loadingFiles: true });
  }
  
  // Now load files in batches across all songs
  const allSongs = library.artists.flatMap((artist, artistIdx) => 
    artist.songs.map((song, songIdx) => ({ song, artistIdx, songIdx }))
  );
  
  console.log(`Loading files for ${allSongs.length} songs...`);
  
  // Process songs in larger batches for file loading
  const FILE_BATCH_SIZE = 15;
  let processed = 0;
  
  for (let i = 0; i < allSongs.length; i += FILE_BATCH_SIZE) {
    const batch = allSongs.slice(i, i + FILE_BATCH_SIZE);
    
    await Promise.all(batch.map(async ({ song, artistIdx, songIdx }) => {
      const files = await loadSongFiles(song.id);
      library.artists[artistIdx].songs[songIdx].files = { ...files, other: [] };
      library.artists[artistIdx].songs[songIdx].loading = false;
    }));
    
    processed += batch.length;
    console.log(`Loaded ${processed}/${allSongs.length} songs`);
    
    // Send progress update every batch
    if (onProgress) {
      onProgress({ 
        ...library, 
        loadingFiles: processed < allSongs.length,
        loadedCount: processed,
        totalCount: allSongs.length,
      });
    }
  }
  
  console.log('Library loading complete!');
  return library;
}

/**
 * Get a single file's download URL
 */
export function getFileDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Get a file's view URL
 */
export function getFileViewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export { ROOT_FOLDER_ID, CLIENT_ID, API_KEY };
