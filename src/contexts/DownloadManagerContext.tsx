import React, { createContext, useContext, useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface DownloadItem {
  id: string;
  title: string;
  thumbnail: string;
  status: 'preparing' | 'downloading' | 'done' | 'error';
  progress: number; // 0-100
}

interface DownloadManagerContextType {
  downloads: DownloadItem[];
  startDownload: (track: { id: string; title: string; thumbnail: string }) => void;
  clearCompleted: () => void;
  isDownloading: (trackId: string) => boolean;
}

const DownloadManagerContext = createContext<DownloadManagerContextType | null>(null);

export function useDownloadManager() {
  const ctx = useContext(DownloadManagerContext);
  if (!ctx) throw new Error('useDownloadManager must be used within DownloadManagerProvider');
  return ctx;
}

// Helper to sanitize filenames
const sanitizeFilename = (filename: string) => {
  return filename.replace(/[<>:"/\\|?*]/g, '').trim();
};

export function DownloadManagerProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  const updateItem = useCallback((id: string, updates: Partial<DownloadItem>) => {
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  const isDownloading = useCallback((trackId: string) => {
    return downloads.some(d => d.id === trackId && (d.status === 'preparing' || d.status === 'downloading'));
  }, [downloads]);

  const startDownload = useCallback(async (track: { id: string; title: string; thumbnail: string }) => {
    if (isDownloading(track.id)) {
      toast.info('Already downloading this track');
      return;
    }

    const item: DownloadItem = {
      id: track.id,
      title: track.title,
      thumbnail: track.thumbnail,
      status: 'preparing',
      progress: 0,
    };

    setDownloads(prev => [item, ...prev.filter(d => d.id !== track.id)]);
    const safeTitle = sanitizeFilename(track.title);

    try {
      updateItem(track.id, { progress: 10 });
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-audio-url?videoId=${track.id}`,
        { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      
      if (!response.ok) throw new Error('Failed to fetch audio URL');
      const data = await response.json();

      if (!data.audioUrl) {
        throw new Error('No audio URL found');
      }

      updateItem(track.id, { status: 'downloading', progress: 30 });

      // Method 1: Blob fetch (Best for progress and reliable filenames)
      try {
        const audioRes = await fetch(data.audioUrl);
        if (!audioRes.ok) throw new Error('Direct fetch blocked');
        
        const contentLength = audioRes.headers.get('content-length');
        const reader = audioRes.body?.getReader();
        
        if (reader && contentLength) {
          const total = parseInt(contentLength, 10);
          let received = 0;
          const chunks = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            updateItem(track.id, { progress: 30 + Math.round((received / total) * 65) });
          }

          const blob = new Blob(chunks, { type: 'audio/mpeg' });
          const blobUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = `${safeTitle}.mp3`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
          
          updateItem(track.id, { status: 'done', progress: 100 });
          toast.success(`🎵 Saved: ${track.title}`);
        } else {
          throw new Error('Stream not available');
        }
      } catch (e) {
        // Method 2: Fallback to direct download link
        console.warn('Blob download failed, falling back to direct link:', e);
        updateItem(track.id, { progress: 80 });
        
        const a = document.createElement('a');
        a.href = data.audioUrl;
        a.download = `${safeTitle}.mp3`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Give it a bit of time then assume success if it didn't crash
        setTimeout(() => {
          updateItem(track.id, { status: 'done', progress: 100 });
          toast.success(`🎵 Download started for: ${track.title}`);
        }, 2000);
      }

      // Auto-cleanup
      setTimeout(() => {
        setDownloads(prev => prev.filter(d => d.id !== track.id));
      }, 5000);

    } catch (error: any) {
      console.error('Download error:', error);
      updateItem(track.id, { status: 'error', progress: 0 });
      toast.error(`Error: ${error.message || 'Failed to download'}`);
      
      setTimeout(() => {
        setDownloads(prev => prev.filter(d => d.id !== track.id));
      }, 8000);
    }
  }, [isDownloading, updateItem]);

  const clearCompleted = useCallback(() => {
    setDownloads(prev => prev.filter(d => d.status === 'preparing' || d.status === 'downloading'));
  }, []);

  return (
    <DownloadManagerContext.Provider value={{ downloads, startDownload, clearCompleted, isDownloading }}>
      {children}
    </DownloadManagerContext.Provider>
  );
}

