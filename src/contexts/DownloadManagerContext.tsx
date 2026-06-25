import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';
import { saveTrackOffline } from '@/lib/offlineStore';
import { Download, Smartphone, Laptop, CheckSquare, Square, X } from 'lucide-react';

export interface DownloadItem {
  id: string;
  title: string;
  thumbnail: string;
  status: 'preparing' | 'downloading' | 'done' | 'error';
  progress: number; // 0-100
}

interface DownloadManagerContextType {
  downloads: DownloadItem[];
  startDownload: (track: { id: string; title: string; thumbnail: string; artist?: string; duration?: number }) => void;
  clearCompleted: () => void;
  isDownloading: (trackId: string) => boolean;
}

const DownloadManagerContext = createContext<DownloadManagerContextType | null>(null);

export function useDownloadManager() {
  const ctx = useContext(DownloadManagerContext);
  if (!ctx) throw new Error('useDownloadManager must be used within DownloadManagerProvider');
  return ctx;
}

const COBALT_INSTANCES = [
  'https://api.cobalt.tools',
  'https://co.wuk.sh',
  'https://cobalt.api.ryboflops.lol',
  'https://cobalt.k6.ovh',
  'https://cobalt.shite.xyz',
  'https://cobalt.smartit.nu',
  'https://cobalt.drgns.space',
  'https://c.onon.app',
  'https://co.v6.sh',
  'https://cobalt.instgrm.lol',
  'https://cobalt.nyx.moe',
  'https://cobalt.q69.de',
  'https://co.dispp.li'
];

const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://piped-api.lre.yt',
  'https://pipedapi.cl7.it',
  'https://piped-api.hostux.net',
  'https://pipedapi.adminforge.de',
  'https://api-piped.mha.fi',
  'https://pipedapi.swish.re',
  'https://pipedapi.spirit.com.de',
  'https://pipedapi.leptons.xyz',
  'https://api.piped.projectsegfau.lt',
  'https://pipedapi.moomoo.me',
  'https://pipedapi.river.rocks'
];

const shuffle = (array: string[]): string[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const getTimeoutSignal = (ms: number) => {
  try {
    return AbortSignal.timeout(ms);
  } catch {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }
};

const safelyParseJson = async <T = any>(response: Response): Promise<T | null> => {
  try {
    const text = await response.text();
    if (!text || text.trim() === '') return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
};

async function raceFirstSuccess<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    let failedCount = 0;
    const total = promises.length;

    if (total === 0) {
      reject(new Error('No promises to race'));
      return;
    }

    promises.forEach(p => {
      p.then(val => {
        if (val && !resolved) {
          resolved = true;
          resolve(val);
        } else {
          failedCount++;
          if (failedCount === total && !resolved) {
            reject(new Error('All raced promises failed'));
          }
        }
      }).catch(err => {
        failedCount++;
        if (failedCount === total && !resolved) {
          reject(new Error('All raced promises failed'));
        }
      });
    });
  });
}

const tryCobaltInstance = async (inst: string, videoId: string): Promise<string | null> => {
  try {
    const res = await fetch(`${inst}/api/json`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        url: `https://www.youtube.com/watch?v=${videoId}`,
        downloadMode: 'audio',
        audioFormat: 'mp3',
        audioQuality: '128'
      }),
      signal: getTimeoutSignal(6000)
    });

    if (res.ok) {
      const data = await safelyParseJson<any>(res);
      if (data?.url) {
        console.log(`[Client Download Resolver] Cobalt success: ${inst}`);
        return data.url;
      }
    }
  } catch (e: any) {
    try {
      const res = await fetch(`${inst}/api/json`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          isAudioOnly: true,
          audioFormat: 'mp3',
          audioQuality: '128'
        }),
        signal: getTimeoutSignal(6000)
      });
      if (res.ok) {
        const data = await safelyParseJson<any>(res);
        if (data?.url) {
          console.log(`[Client Download Resolver] Cobalt success (fallback): ${inst}`);
          return data.url;
        }
      }
    } catch {}
  }
  return null;
};

const tryInvidiousInstance = async (inst: string, videoId: string): Promise<string | null> => {
  try {
    const testUrl = `${inst}/latest_version?id=${videoId}&local=true&itag=140`;
    const res = await fetch(testUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      signal: getTimeoutSignal(5000)
    });
    if (res.status === 200 || res.status === 206) {
      console.log(`[Client Download Resolver] Invidious success: ${inst}`);
      return res.url;
    }
  } catch {}
  return null;
};

const tryPipedInstance = async (inst: string, videoId: string): Promise<string | null> => {
  try {
    const res = await fetch(`${inst}/streams/${videoId}`, {
      signal: getTimeoutSignal(5000),
      headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    });
    if (res.ok) {
      const data = await safelyParseJson<any>(res);
      if (data) {
        const audioStreams = data.audioStreams || [];
        const best = audioStreams.find((s: any) => s.mimeType?.includes('audio/mp4')) ||
                     audioStreams.sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (best?.url) {
          console.log(`[Client Download Resolver] Piped success: ${inst}`);
          return best.url;
        }
      }
    }
  } catch {}
  return null;
};

const resolveAudioUrlOnClient = async (videoId: string, isDownloadMode: boolean = false): Promise<string | null> => {
  console.log(`[Client Download Resolver] Resolving backup audio stream for ${videoId} in parallel...`);

  const cobaltPromises = shuffle(COBALT_INSTANCES).slice(0, 4).map(inst => tryCobaltInstance(inst, videoId));
  const invidiousPromises = shuffle([
    'https://inv.thepixora.com',
    'https://yewtu.be',
    'https://invidious.projectsegfau.lt',
    'https://inv.nadeko.net',
    'https://invidious.flokinet.to',
    'https://invidious.lre.yt'
  ]).slice(0, 4).map(inst => tryInvidiousInstance(inst, videoId));
  const pipedPromises = shuffle(PIPED_INSTANCES).slice(0, 4).map(inst => tryPipedInstance(inst, videoId));

  try {
    const url = await raceFirstSuccess([
      ...cobaltPromises,
      ...invidiousPromises,
      ...pipedPromises
    ]);
    return url;
  } catch (err) {
    console.error('[Client Download Resolver] All parallel resolution attempts failed:', err);
    return null;
  }
};

// Helper to sanitize filenames
const sanitizeFilename = (filename: string) => {
  return filename.replace(/[<>:"/\\|?*]/g, '').trim();
};

export function DownloadManagerProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const { settings, updateSettings } = useTheme();

  // Dialog prompt states
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingTrack, setPendingTrack] = useState<{ id: string; title: string; thumbnail: string; artist?: string; duration?: number } | null>(null);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const updateItem = useCallback((id: string, updates: Partial<DownloadItem>) => {
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  const isDownloading = useCallback((trackId: string) => {
    return downloads.some(d => d.id === trackId && (d.status === 'preparing' || d.status === 'downloading'));
  }, [downloads]);

  // A robust candidate-based downloader that handles fallback URLs and CORS proxying
  const fetchAudioBlob = useCallback(async (
    track: { id: string; title: string },
    onProgress: (progress: number) => void
  ): Promise<Blob> => {
    const videoId = track.id;
    const candidates: { name: string; url: string }[] = [];

    // Always route through local container server's high-speed API to ensure stable Node.js streaming
    const baseUrl = '/api/get-audio-url';

    // Try client-side resolution first since client's residential IP has high success rates and avoids Vercel backend rate-limiting/timeouts
    try {
      console.log('[Download Manager] Resolving audio stream url on client first...');
      const clientUrl = await resolveAudioUrlOnClient(videoId, true);
      if (clientUrl) {
        candidates.push({
          name: 'Client-Resolved Stream (Proxied)',
          url: `${baseUrl}?proxyUrl=${encodeURIComponent(clientUrl)}`
        });
        candidates.push({
          name: 'Client-Resolved Stream (Direct)',
          url: clientUrl
        });
      }
    } catch (e) {
      console.warn('[Download Manager] Client-side resolution failed:', e);
    }

    // Candidate: Standard server-side download endpoint (fully managed, same-origin, CORS-free, proxies stream)
    candidates.push({
      name: 'Server Audio Proxy (download mode)',
      url: `${baseUrl}?videoId=${videoId}&download=1&title=${encodeURIComponent(track.title)}`
    });

    // Candidate: Standard server-side streaming endpoint
    candidates.push({
      name: 'Server Audio Proxy (stream mode)',
      url: `${baseUrl}?videoId=${videoId}&stream=1`
    });

    // Candidate: Get direct url via JSON fetch first, then proxy via server
    try {
      const jsonRes = await fetch(`${baseUrl}?videoId=${videoId}`);
      if (jsonRes.ok) {
        const data = await jsonRes.json();
        const directUrl = data?.audioUrl || data?.audioUrl1;
        if (directUrl) {
          candidates.push({
            name: 'Direct Audio Stream (Proxied)',
            url: `${baseUrl}?proxyUrl=${encodeURIComponent(directUrl)}`
          });
        }
      }
    } catch (e) {
      console.warn('[Download Manager] Pre-fetching direct JSON failed:', e);
    }

    let lastError = null;
    for (const cand of candidates) {
      try {
        console.log(`[Download Manager] Attempting fetch: ${cand.name}`);
        onProgress(10);

        // Increase fetch connection and stream timeout to 120 seconds for large files
        const response = await fetch(cand.url, { signal: getTimeoutSignal(120000) });
        if (!response.ok) {
          throw new Error(`HTTP status ${response.status}`);
        }

        const contentLength = response.headers.get('content-length');
        const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;

        let receivedBytes = 0;
        const reader = response.body?.getReader();

        if (!reader) {
          const blob = await response.blob();
          if (blob.size < 100000) {
            throw new Error('Downloaded file is too small (likely a server error page)');
          }
          return blob;
        }

        const chunks: Uint8Array[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          receivedBytes += value.length;

          if (totalBytes > 0) {
            const progress = Math.round((receivedBytes / totalBytes) * 100);
            onProgress(Math.min(Math.max(progress, 15), 98));
          } else {
            // Indeterminate progress representation
            onProgress(50);
          }
        }

        const audioBlob = new Blob(chunks, { type: 'audio/mpeg' });
        if (audioBlob.size < 100000) {
          throw new Error('Downloaded blob is too small (likely a server error page)');
        }

        console.log(`[Download Manager] Download successful using: ${cand.name}`);
        return audioBlob;
      } catch (err: any) {
        console.warn(`[Download Manager] Candidate ${cand.name} failed:`, err);
        lastError = err;
      }
    }

    throw lastError || new Error('All download methods failed');
  }, []);

  // Performs standard browser download by fetching the blob first and triggering download
  const downloadToDevice = useCallback(async (track: { id: string; title: string; thumbnail: string }) => {
    const item: DownloadItem = {
      id: track.id,
      title: track.title,
      thumbnail: track.thumbnail,
      status: 'preparing',
      progress: 0,
    };

    setDownloads(prev => [item, ...prev.filter(d => d.id !== track.id)]);

    try {
      updateItem(track.id, { status: 'downloading', progress: 5 });

      const audioBlob = await fetchAudioBlob(track, (prog) => {
        updateItem(track.id, { progress: prog });
      });

      // Save file on device using a secure client-side blob URL
      const blobUrl = URL.createObjectURL(audioBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${sanitizeFilename(track.title)}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Keep object URL active for a moment to allow download start
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 5000);

      updateItem(track.id, { status: 'done', progress: 100 });
      toast.success(`🎵 Download complete! Saved to device: ${track.title}`);

    } catch (error: any) {
      console.error('Device download error:', error);
      
      // FALLBACK TO DIRECT BROWSER DOWNLOAD LINK!
      // This completely bypasses all CORS fetch limitations, local sandbox issues, and GCP IP geoblocking
      try {
        updateItem(track.id, { status: 'downloading', progress: 50 });
        toast.info('Direct download fallback activated...');
        
        const directUrl = await resolveAudioUrlOnClient(track.id, true);
        const downloadUrl = directUrl || `/api/get-audio-url?videoId=${track.id}&download=1&title=${encodeURIComponent(track.title)}`;
        
        updateItem(track.id, { status: 'done', progress: 100 });
        toast.success(`🎵 Direct download triggered!`);
        
        // Trigger browser native download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${sanitizeFilename(track.title)}.mp3`;
        link.target = '_blank';
        link.rel = 'noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      } catch (fbErr: any) {
        console.error('Direct fallback failed:', fbErr);
      }

      updateItem(track.id, { status: 'error', progress: 0 });
      toast.error(`Error: ${error.message || 'Failed to download to device'}`);

      setTimeout(() => {
        setDownloads(prev => prev.filter(d => d.id !== track.id));
      }, 8000);
    }

    // Auto-cleanup for success case
    setTimeout(() => {
      setDownloads(prev => prev.filter(d => d.id !== track.id));
    }, 15000);
  }, [updateItem, fetchAudioBlob]);

  // Performs in-app download (Blob saved to IndexedDB)
  const downloadInApp = useCallback(async (track: { id: string; title: string; thumbnail: string; artist?: string; duration?: number }) => {
    const item: DownloadItem = {
      id: track.id,
      title: track.title,
      thumbnail: track.thumbnail,
      status: 'preparing',
      progress: 0,
    };

    setDownloads(prev => [item, ...prev.filter(d => d.id !== track.id)]);

    try {
      updateItem(track.id, { status: 'downloading', progress: 5 });

      const audioBlob = await fetchAudioBlob(track, (prog) => {
        updateItem(track.id, { progress: prog });
      });

      await saveTrackOffline(track, audioBlob);
      updateItem(track.id, { status: 'done', progress: 100 });
      toast.success(`🎵 Saved to offline downloads: ${track.title}`);

    } catch (error: any) {
      console.error('In-app download error:', error);
      updateItem(track.id, { status: 'error', progress: 0 });
      toast.error(`Error: ${error.message || 'Failed to download to app'}`);

      setTimeout(() => {
        setDownloads(prev => prev.filter(d => d.id !== track.id));
      }, 8000);
    }

    // Auto-cleanup for success case
    setTimeout(() => {
      setDownloads(prev => prev.filter(d => d.id !== track.id));
    }, 15000);
  }, [updateItem, fetchAudioBlob]);

  // Main entry point for downloading
  const startDownload = useCallback((track: { id: string; title: string; thumbnail: string; artist?: string; duration?: number }) => {
    if (isDownloading(track.id)) {
      toast.info('Already downloading this track');
      return;
    }

    const pref = settings.downloadPreference || 'ask';

    if (pref === 'ask') {
      setPendingTrack(track);
      setDontAskAgain(false);
      setPromptOpen(true);
    } else if (pref === 'device') {
      downloadToDevice(track);
    } else {
      downloadInApp(track);
    }
  }, [settings.downloadPreference, isDownloading, downloadToDevice, downloadInApp]);

  const handleSelectOption = (option: 'device' | 'app') => {
    if (!pendingTrack) return;
    
    // Save preference if checked
    if (dontAskAgain) {
      updateSettings({ downloadPreference: option });
      toast.success(`Preference saved! You can change this in Settings.`);
    }

    if (option === 'device') {
      downloadToDevice(pendingTrack);
    } else {
      downloadInApp(pendingTrack);
    }

    setPromptOpen(false);
    setPendingTrack(null);
  };

  const clearCompleted = useCallback(() => {
    setDownloads(prev => prev.filter(d => d.status === 'preparing' || d.status === 'downloading'));
  }, []);

  return (
    <DownloadManagerContext.Provider value={{ downloads, startDownload, clearCompleted, isDownloading }}>
      {children}

      {/* Choice Prompt Dialog */}
      {promptOpen && pendingTrack && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-md z-[1000] flex items-center justify-center p-4"
          onClick={() => setPromptOpen(false)}
        >
          <div 
            className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col gap-5 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Background Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Download className="w-5 h-5 text-primary animate-bounce" />
                Download Options
              </h3>
              <button 
                onClick={() => setPromptOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Track Info */}
            <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-2xl border border-border">
              <img 
                src={pendingTrack.thumbnail} 
                alt={pendingTrack.title} 
                className="w-12 h-12 object-cover rounded-xl shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{pendingTrack.title}</p>
                <p className="text-xs text-muted-foreground truncate">{pendingTrack.artist || 'YouTube Stream'}</p>
              </div>
            </div>

            {/* Selection Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleSelectOption('device')}
                className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-background hover:bg-primary/5 hover:border-primary/30 transition-all text-left cursor-pointer active:scale-98"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Laptop className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Download to Device</h4>
                  <p className="text-xs text-muted-foreground">Saves file (.mp3) to your downloads folder.</p>
                </div>
              </button>

              <button
                onClick={() => handleSelectOption('app')}
                className="flex items-center gap-4 p-4 rounded-2xl border border-primary/20 bg-primary/10 hover:bg-primary/15 hover:border-primary/40 transition-all text-left cursor-pointer active:scale-98"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 animate-pulse">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Save in App (Offline Mode)</h4>
                  <p className="text-xs text-muted-foreground">Caches in local storage for playing inside the app completely offline.</p>
                </div>
              </button>
            </div>

            {/* Never Ask Again Checkbox */}
            <button
              onClick={() => setDontAskAgain(prev => !prev)}
              className="flex items-center gap-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 text-left select-none cursor-pointer"
            >
              {dontAskAgain ? (
                <CheckSquare className="w-4 h-4 text-primary" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              <span>Remember selection and never ask again</span>
            </button>
          </div>
        </div>
      )}
    </DownloadManagerContext.Provider>
  );
}
