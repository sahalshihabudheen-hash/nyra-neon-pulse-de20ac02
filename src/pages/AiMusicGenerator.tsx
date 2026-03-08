import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Sparkles, Loader2, Play, Pause, Download, Wand2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { toast } from 'sonner';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import MusicPlayer from '@/components/MusicPlayer';
import { useAuth } from '@/hooks/useAuth';

const genrePresets = [
  { label: '🎸 Rock', prompt: 'Energetic rock track with electric guitars, driving drums, and powerful bass' },
  { label: '🎹 Lo-Fi', prompt: 'Chill lo-fi hip hop beat with warm piano, vinyl crackle, and relaxing vibes' },
  { label: '🎷 Jazz', prompt: 'Smooth jazz with saxophone, upright bass, and brushed drums' },
  { label: '🎶 Pop', prompt: 'Catchy pop track with synths, upbeat tempo, and modern production' },
  { label: '🎻 Classical', prompt: 'Orchestral classical piece with strings, woodwinds, and elegant melody' },
  { label: '🔊 EDM', prompt: 'High energy EDM track with heavy bass drops, synth leads, and driving beat' },
  { label: '🪕 Country', prompt: 'Country song with acoustic guitar, fiddle, and warm storytelling feel' },
  { label: '🥁 Hip Hop', prompt: 'Hard-hitting hip hop instrumental with 808 bass, trap hi-hats, and dark melody' },
];

const durationOptions = [
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
];

const AiMusicGenerator = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { gradient } = useTheme();
  const [activeTab, setActiveTab] = useState('ai-music');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [generationHistory, setGenerationHistory] = useState<Array<{ prompt: string; audioUrl: string; duration: number }>>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const {
    currentTrack, isPlaying: playerIsPlaying, ytPlayerRef, audioRef: playerAudioRef,
    handlePlayTrack, handlePlayPause, handleNext, handlePrevious,
    handlePlayFromPlaylist, handlePlayFromQueue,
    handleAddToPlaylist, handleAddToQueue,
    handleRemoveFromPlaylist, handleClearPlaylist,
    playlist, queue, isInPlaylist, removeFromQueue, reorderPlaylist,
    shuffleMode, toggleShuffle,
    isFavorite, toggleFavorite,
    setShowMiniPlayer,
  } = useMusicPlayer();

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    setShowMiniPlayer(true);
  }, [setShowMiniPlayer]);

  const generateMusic = async (presetPrompt?: string) => {
    const text = presetPrompt || prompt;
    if (!text.trim()) {
      toast.error('Please describe the music you want to create');
      return;
    }

    setLoading(true);
    setAudioUrl(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-music`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ prompt: text, duration }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to generate music');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setGenerationHistory(prev => [{ prompt: text, audioUrl: url, duration }, ...prev.slice(0, 4)]);
      toast.success('🎵 Music generated successfully!');
    } catch (error) {
      console.error('Music generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate music');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `ai-music-${Date.now()}.mp3`;
    a.click();
  };

  const playFromHistory = (item: typeof generationHistory[0]) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setAudioUrl(item.audioUrl);
    setPrompt(item.prompt);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-background/80 gradient-bg noise-overlay">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="ml-0 md:ml-64">
        <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} onSearch={() => navigate('/')} />

        <main className="pt-24 md:pt-28 pb-48 md:pb-36 px-4 md:px-8">
          {/* Header */}
          <div className="mb-8 animate-in-up">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={gradient.enabled ? { background: 'var(--theme-gradient)' } : { backgroundColor: 'hsl(var(--primary))' }}
              >
                <Wand2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">AI Music Generator</h1>
                <p className="text-muted-foreground text-sm">Create original music tracks with AI — powered by ElevenLabs</p>
              </div>
            </div>
          </div>

          {/* Genre Presets */}
          <div className="flex flex-wrap gap-3 mb-6 animate-in-up" style={{ animationDelay: '0.1s' }}>
            {genrePresets.map((genre) => (
              <button
                key={genre.label}
                onClick={() => {
                  setPrompt(genre.prompt);
                  generateMusic(genre.prompt);
                }}
                disabled={loading}
                className={cn(
                  "px-5 py-3 rounded-2xl font-medium text-sm transition-all active:scale-95",
                  "bg-secondary/80 text-foreground hover:bg-primary hover:text-primary-foreground",
                  "border border-border/50 backdrop-blur-sm"
                )}
              >
                {genre.label}
              </button>
            ))}
          </div>

          {/* Prompt Input */}
          <div className="glass-premium rounded-3xl p-6 md:p-8 mb-6 animate-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Music className="absolute left-4 top-4 w-5 h-5 text-muted-foreground" />
                <textarea
                  placeholder="Describe the music you want to create... e.g., 'A dreamy ambient track with soft synths and gentle rain sounds'"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                  rows={3}
                  className={cn(
                    "w-full pl-12 pr-4 py-4 rounded-2xl bg-secondary/60 border border-border/50",
                    "text-foreground placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
                    "transition-all text-base resize-none"
                  )}
                />
              </div>

              {/* Duration + Generate */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Duration:</span>
                  <div className="flex gap-2">
                    {durationOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDuration(opt.value)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                          duration === opt.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/60 text-foreground hover:bg-secondary"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => generateMusic()}
                  disabled={loading || !prompt.trim()}
                  className={cn(
                    "flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base sm:ml-auto",
                    "text-primary-foreground transition-all active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  style={gradient.enabled ? { background: 'var(--theme-gradient)' } : { backgroundColor: 'hsl(var(--primary))' }}
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {loading ? 'Generating...' : 'Generate Music'}
                </button>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="glass-premium rounded-3xl p-12 text-center animate-in-up mb-6">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border-4 border-primary/40 animate-pulse" />
                <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Music className="w-6 h-6 text-primary animate-bounce" />
                </div>
              </div>
              <p className="text-foreground font-semibold text-lg">Creating your music...</p>
              <p className="text-muted-foreground text-sm mt-2">This may take up to a minute depending on duration</p>
            </div>
          )}

          {/* Audio Player */}
          {audioUrl && !loading && (
            <div className="glass-premium rounded-3xl p-6 md:p-8 mb-6 animate-in-up">
              <div className="flex items-center gap-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={gradient.enabled ? { background: 'var(--theme-gradient)' } : { backgroundColor: 'hsl(var(--primary))' }}
                >
                  <Music className="w-5 h-5 text-primary-foreground" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Your Generated Track</h2>
              </div>

              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlayback}
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95",
                    "text-primary-foreground"
                  )}
                  style={gradient.enabled ? { background: 'var(--theme-gradient)' } : { backgroundColor: 'hsl(var(--primary))' }}
                >
                  {isPlaying ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6 ml-1" fill="currentColor" />}
                </button>

                <div className="flex-1">
                  <p className="text-foreground font-medium text-sm truncate">{prompt}</p>
                  <p className="text-muted-foreground text-xs">{duration}s • AI Generated</p>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-all"
                >
                  <Download className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </div>
          )}

          {/* History */}
          {generationHistory.length > 0 && (
            <div className="glass-premium rounded-3xl p-6 animate-in-up" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-lg font-bold text-foreground mb-4">Recent Generations</h3>
              <div className="space-y-3">
                {generationHistory.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => playFromHistory(item)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-secondary/40 hover:bg-secondary/80 border border-border/30 transition-all text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Play className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">{item.prompt}</p>
                      <p className="text-muted-foreground text-xs">{item.duration}s</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!audioUrl && !loading && generationHistory.length === 0 && (
            <div className="glass-premium rounded-3xl p-12 text-center animate-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Wand2 className="w-10 h-10 text-primary" />
              </div>
              <p className="text-foreground font-semibold text-lg mb-2">Create original music with AI</p>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Describe the style, mood, and instruments — or pick a genre preset above — and AI will compose a unique track for you
              </p>
            </div>
          )}
        </main>
      </div>

      <MusicPlayer
        currentTrack={currentTrack}
        isPlaying={playerIsPlaying}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onAddToPlaylist={handleAddToPlaylist}
        isInPlaylist={currentTrack ? isInPlaylist(currentTrack.id) : false}
        playlist={playlist}
        onPlayFromPlaylist={handlePlayFromPlaylist}
        onRemoveFromPlaylist={handleRemoveFromPlaylist}
        onClearPlaylist={handleClearPlaylist}
        onReorderPlaylist={reorderPlaylist}
        ytPlayerRef={ytPlayerRef}
        audioRef={playerAudioRef}
        shuffleMode={shuffleMode}
        onToggleShuffle={toggleShuffle}
        queue={queue}
        onRemoveFromQueue={removeFromQueue}
        onPlayFromQueue={handlePlayFromQueue}
      />
    </div>
  );
};

export default AiMusicGenerator;
