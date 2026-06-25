/**
 * Frontend Controller (app.js)
 * Registers service workers, monitors connectivity state, and binds
 * HTML5 Audio player elements directly to IndexedDB audio Blobs.
 */

class OfflineMusicController {
  constructor() {
    this.audioElement = null;
    this.currentTrackUrl = null;
    this.currentTrackId = null;
    
    this.init();
  }

  init() {
    // 1. Register Progressive Web App (PWA) Service Worker
    this.registerServiceWorker();

    // 2. Establish connection state monitoring
    this.setupConnectivityListeners();

    // 3. Set up native audio playback events
    this.setupAudioEngine();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('[PWA App] Service Worker registered successfully: ', registration.scope);
          })
          .catch((err) => {
            console.error('[PWA App] Service Worker registration failed: ', err);
          });
      });
    }
  }

  setupConnectivityListeners() {
    const updateNetworkBadge = () => {
      const isOnline = navigator.onLine;
      console.log(`[PWA App] Connectivity state updated: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      
      // Dispatch a custom window event for other application layers to read
      const event = new CustomEvent('pwaConnectionChange', { detail: { isOnline } });
      window.dispatchEvent(event);
      
      // If we are offline, let's warn the user or update UI components gracefully
      if (!isOnline) {
        this.notifyUser('Offline mode active. You can play any of your downloaded tracks!');
      } else {
        this.notifyUser('Back online! Ready to stream and download new music.');
      }
    };

    window.addEventListener('online', updateNetworkBadge);
    window.addEventListener('offline', updateNetworkBadge);
    
    // Initial verification
    setTimeout(updateNetworkBadge, 500);
  }

  setupAudioEngine() {
    // Create an audio element if one does not exist
    this.audioElement = document.querySelector('audio');
    if (!this.audioElement) {
      this.audioElement = document.createElement('audio');
      this.audioElement.id = 'pwa-native-audio';
      this.audioElement.controls = true;
      // Append to body or a specific control section
      document.body.appendChild(this.audioElement);
    }

    // Auto-revoke URL to prevent memory leaks when a track finishes or changes
    this.audioElement.addEventListener('ended', () => {
      this.cleanupCurrentObjectURL();
    });
  }

  cleanupCurrentObjectURL() {
    if (this.currentTrackUrl) {
      console.log('[Audio Engine] Revoking active object URL to free browser memory.');
      URL.revokeObjectURL(this.currentTrackUrl);
      this.currentTrackUrl = null;
    }
  }

  /**
   * Play a track either from local IndexedDB cache or fall back to online streaming.
   * @param {string} trackId - The Unique Track Identifier
   * @param {string} fallbackStreamUrl - The online source URL if cache is missing
   */
  async playTrack(trackId, fallbackStreamUrl = '') {
    this.cleanupCurrentObjectURL();
    this.currentTrackId = trackId;

    try {
      // Step 1: Check if track exists locally in our OfflineDB
      const cachedTrack = await window.OfflineDB.getTrackOffline(trackId);

      if (cachedTrack && cachedTrack.audioBlob) {
        console.log(`[Audio Engine] Cache HIT for track: ${cachedTrack.title}. Playing offline.`);
        
        // Convert the Blob into a secure local audio URL
        this.currentTrackUrl = URL.createObjectURL(cachedTrack.audioBlob);
        this.audioElement.src = this.currentTrackUrl;
        
        // Play the track
        await this.audioElement.play();
        this.notifyUser(`Now playing cached track: ${cachedTrack.title}`);
        return true;
      }

      // Step 2: Fallback to streaming online if connection permits
      if (!navigator.onLine) {
        this.notifyUser('Error: You are offline, and this song has not been saved for offline playback.', 'error');
        return false;
      }

      if (fallbackStreamUrl) {
        console.log(`[Audio Engine] Cache MISS for ${trackId}. Streaming online...`);
        this.audioElement.src = fallbackStreamUrl;
        await this.audioElement.play();
        return true;
      }

      throw new Error('Track not cached and no online stream URL provided.');

    } catch (error) {
      console.error('[Audio Engine] Playback failed:', error);
      this.notifyUser(`Playback error: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * UI notification bridge. Fits both native alerts, toast logs, or custom elements.
   */
  notifyUser(message, type = 'info') {
    console.log(`[Notification] [${type.toUpperCase()}] ${message}`);
    // Dispatch custom events so modular Toast libraries or React modules can listen
    const event = new CustomEvent('pwaNotification', { detail: { message, type } });
    window.dispatchEvent(event);
  }
}

// Instantiate the manager on load
window.PwaMusicController = new OfflineMusicController();
