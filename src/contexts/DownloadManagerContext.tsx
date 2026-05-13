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
      updateItem(track.id, { status: 'downloading', progress: 50 });
      
      const downloadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-audio-url?videoId=${track.id}&download=1&title=${encodeURIComponent(track.title)}`;
      
      // Use a hidden iframe or direct window location to trigger the download
      // This is the most reliable way to trigger a "Save As" through a proxy with Content-Disposition
      const a = document.createElement('a');
      a.href = downloadUrl;
      // Note: download attribute only works same-origin, but the server header Content-Disposition overrides it anyway
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        updateItem(track.id, { status: 'done', progress: 100 });
        toast.success(`🎵 Download started: ${track.title}`);
      }, 2000);
    } catch (error: any) {
      console.error('Download error:', error);
      updateItem(track.id, { status: 'error', progress: 0 });
      toast.error(`Error: ${error.message || 'Failed to download'}`);
      
      setTimeout(() => {
        setDownloads(prev => prev.filter(d => d.id !== track.id));
      }, 8000);
    }
    
    // Auto-cleanup for success case
    setTimeout(() => {
      setDownloads(prev => prev.filter(d => d.id !== track.id));
    }, 15000);
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

