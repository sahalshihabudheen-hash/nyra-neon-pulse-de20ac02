/**
 * Offline Audio Storage Engine (offline-db.js)
 * High-performance IndexedDB wrapper to save, load, delete, and query
 * audio binary Blobs alongside their respective metadata.
 */

const DB_NAME = 'NyraOfflineMusicDB';
const DB_VERSION = 1;
const STORE_NAME = 'tracks';

/**
 * Initializes the IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
function initOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error('[Offline DB] Initialization failed:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Saves a track's audio Blob and metadata to IndexedDB.
 * Handles storage estimate and quota checks before insertion.
 * @param {object} track - { id, title, thumbnail, artist, duration }
 * @param {Blob} audioBlob - The raw binary mp3 blob
 * @returns {Promise<void>}
 */
async function saveTrackOffline(track, audioBlob) {
  // Check Storage Quota compatibility
  if (navigator.storage && navigator.storage.estimate) {
    const { usage, quota } = await navigator.storage.estimate();
    const remaining = quota - usage;
    if (audioBlob.size > remaining) {
      throw new Error(`Insufficient storage quota remaining. Need ${Math.round(audioBlob.size / 1024 / 1024)}MB but only have ${Math.round(remaining / 1024 / 1024)}MB.`);
    }
  }

  const db = await initOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record = {
      id: track.id,
      title: track.title,
      thumbnail: track.thumbnail,
      artist: track.artist || 'Unknown Artist',
      duration: track.duration || 0,
      size: audioBlob.size,
      downloadedAt: Date.now(),
      audioBlob: audioBlob
    };

    const request = store.put(record);

    request.onsuccess = () => {
      console.log(`[Offline DB] Successfully cached track: ${track.title} (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB)`);
      resolve();
    };

    request.onerror = () => {
      console.error('[Offline DB] Put operation failed:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Retrieves a cached track's binary and metadata from IndexedDB.
 * @param {string} id - The YouTube/Track Video ID
 * @returns {Promise<object|null>}
 */
async function getTrackOffline(id) {
  const db = await initOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      console.error('[Offline DB] Get operation failed:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Check if a specific track is downloaded and cached offline.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
async function isTrackDownloadedOffline(id) {
  const track = await getTrackOffline(id);
  return !!track;
}

/**
 * Deletes a cached track from IndexedDB to free up storage space.
 * @param {string} id
 * @returns {Promise<void>}
 */
async function deleteOfflineTrack(id) {
  const db = await initOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      console.log(`[Offline DB] Successfully deleted track: ${id}`);
      resolve();
    };

    request.onerror = () => {
      console.error('[Offline DB] Delete operation failed:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Retrieves all stored tracks to populate offline playback lists.
 * @returns {Promise<Array>}
 */
async function getAllOfflineTracks() {
  const db = await initOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      console.error('[Offline DB] GetAll operation failed:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Deletes all cached tracks, wiping the storage clean.
 * @returns {Promise<void>}
 */
async function clearAllOfflineTracks() {
  const db = await initOfflineDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      console.log('[Offline DB] Offline music cache cleared.');
      resolve();
    };

    request.onerror = () => {
      console.error('[Offline DB] Clear operation failed:', request.error);
      reject(request.error);
    };
  });
}

// Expose functions globally for app.js or frontend scripts to import
window.OfflineDB = {
  saveTrackOffline,
  getTrackOffline,
  isTrackDownloadedOffline,
  deleteOfflineTrack,
  getAllOfflineTracks,
  clearAllOfflineTracks
};
