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

export function DownloadManagerProvider({ children }: { children: React.ReactNode }) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);

  const updateItem = useCallback((id: string, updates: Partial<DownloadItem>) => {
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
  }, []);

  const isDownloading = useCallback((trackId: string) => {
    return downloads.some(d => d.id === trackId && (d.status === 'preparing' || d.status === 'downloading'));
  }, [downloads]);

  const startDownload = useCallback(async (track: { id: string; title: string; thumbnail: string }) => {
    // Don't start duplicate downloads
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

    try {
      // Fetch audio URL
      updateItem(track.id, { progress: 20 });
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-audio-url?videoId=${track.id}`,
        { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      const data = await response.json();

      if (!data.audioUrl) {
        updateItem(track.id, { status: 'error', progress: 0 });
        toast.error(`Download not available: ${track.title}`);
        return;
      }

      updateItem(track.id, { status: 'downloading', progress: 50 });

      // Try to fetch as blob for real progress
      try {
        const audioRes = await fetch(data.audioUrl);
        const contentLength = audioRes.headers.get('content-length');
        
        if (audioRes.body && contentLength) {
          const total = parseInt(contentLength, 10);
          const reader = audioRes.body.getReader();
          const chunks: Uint8Array[] = [];
          let received = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.length;
            const pct = Math.min(95, 50 + Math.round((received / total) * 45));
            updateItem(track.id, { progress: pct });
          }

          const blob = new Blob(chunks as BlobPart[], { type: 'audio/mpeg' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${track.title}.mp3`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          // Fallback: direct link download
          const a = document.createElement('a');
          a.href = data.audioUrl;
          a.download = `${track.title}.mp3`;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch {
        // Fallback: direct link
        const a = document.createElement('a');
        a.href = data.audioUrl;
        a.download = `${track.title}.mp3`;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      updateItem(track.id, { status: 'done', progress: 100 });
      toast.success(`🎵 Downloaded: ${track.title}`);
      // Auto-remove completed download after 5 seconds
      setTimeout(() => {
        setDownloads(prev => prev.filter(d => d.id !== track.id));
      }, 5000);
    } catch {
      updateItem(track.id, { status: 'error', progress: 0 });
      toast.error(`Failed to download: ${track.title}`);
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
