import { useEffect, useRef, useState, type FormEvent } from 'react';
import Sidebar from '@/components/Sidebar';
import TrackGrid from '@/components/TrackGrid';
import { useDjAudio } from '@/hooks/useDjAudio';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { Slider } from '@/components/ui/slider';
import { Headphones, Power, RotateCcw, Loader2, Search, Zap, Music2, Activity, ChevronDown, ChevronUp, ListMusic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Track { id: string; title: string; thumbnail: string; channel: string; }

interface Playlist {
  id: string;
  name: string;
}

/* ─── Spinning Vinyl ─── */
const Vinyl = ({ spinning, level, side }: { spinning: boolean; level: number; side: 'L' | 'R' }) => (
  <div className="relative flex items-center justify-center">
    {/* Outer glow ring */}
    <div
      className="absolute rounded-full transition-all duration-100"
      style={{
        width: 180, height: 180,
        boxShadow: `0 0 ${20 + level * 60}px ${level * 40}px hsl(var(--primary)/0.3)`,
        opacity: 0.6 + level * 0.4,
      }}
    />
    {/* Vinyl record */}
    <div
      className={cn('relative rounded-full border-4 border-white/10 shadow-2xl', spinning && 'animate-spin')}
      style={{ width: 160, height: 160, animationDuration: '2s', background: 'radial-gradient(circle, #1a1a1a 30%, #111 50%, #0a0a0a 100%)' }}
    >
      {/* Grooves */}
      {[50, 65, 80, 95, 110, 125, 140].map(r => (
        <div key={r} className="absolute rounded-full border border-white/5"
          style={{ width: r, height: r, top: (160 - r) / 2, left: (160 - r) / 2 }} />
      ))}
      {/* Label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-primary/50"
          style={{ background: 'hsl(var(--primary)/0.2)' }}>
          <span className="text-2xl font-black text-primary italic">{side}</span>
        </div>
      </div>
      {/* Needle line */}
      <div className="absolute top-1/2 left-1/2 w-full h-[1px] bg-primary/20 origin-left" style={{ transform: 'rotate(-30deg)' }} />
    </div>
  </div>
);

/* ─── VU Meter ─── */
const VuMeter = ({ level }: { level: number }) => {
  const bars = 16;
  return (
    <div className="flex items-end gap-0.5 h-8">
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i + 1) / bars;
        const active = level >= threshold;
        const color = i < 10 ? 'bg-primary' : i < 13 ? 'bg-yellow-400' : 'bg-red-500';
        return (
          <div key={i}
            className={cn('flex-1 rounded-sm transition-all duration-75', active ? color : 'bg-white/5')}
            style={{ height: `${40 + i * 4}%` }}
          />
        );
      })}
    </div>
  );
};

/* ─── EQ Fader ─── */
const EQFader = ({ label, value, onChange, color = 'primary' }: { label: string; value: number; onChange: (v: number) => void; color?: string }) => (
  <div className="flex flex-col items-center gap-3">
    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
    <div className="relative flex flex-col items-center" style={{ height: 120 }}>
      <Slider
        orientation="vertical"
        min={-12} max={12} step={0.5}
        value={[value]}
        onValueChange={v => onChange(v[0])}
        className="h-28"
      />
    </div>
    <span className={cn('text-xs font-black tabular-nums', value > 0 ? 'text-primary' : value < 0 ? 'text-red-400' : 'text-muted-foreground')}>
      {value > 0 ? '+' : ''}{value.toFixed(1)}
    </span>
  </div>
);

/* ─── Main Component ─── */
const DjMode = () => {
  const { currentTrack, isPlaying, activeSource, playlist, forceBackgroundPlayback, handleAddToQueue, isFavorite, toggleFavorite } = useMusicPlayer();
  const { state, apply, init, getLevels } = useDjAudio();
  const [levels, setLevels] = useState({ left: 0, right: 0 });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState(false);
  const [forcing, setForcing] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const rafRef = useRef<number>();
  const [beat, setBeat] = useState(false);
  const beatRef = useRef<ReturnType<typeof setInterval>>();

  const { user } = useAuth();
  const [userPlaylists, setUserPlaylists] = useState<Playlist[]>([]);
  const [loadedPlaylistTracks, setLoadedPlaylistTracks] = useState<Track[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserPlaylists();
    }
  }, [user]);

  const fetchUserPlaylists = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('playlists')
        .select('id, name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setUserPlaylists(data);
    } catch (err) {
      console.error('Could not fetch playlists', err);
    }
  };

  const loadPlaylistTracks = async (playlistId: string) => {
    setLoadingPlaylists(true);
    try {
      const { data, error } = await supabase
        .from('playlist_items')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true });
        
      if (error) throw error;
      
      if (data) {
        const tracks: Track[] = data.map(item => ({
          id: item.track_id,
          title: item.track_title,
          thumbnail: item.track_thumbnail || '',
          channel: item.track_channel || 'Unknown',
        }));
        setLoadedPlaylistTracks(tracks);
        toast.success(`Loaded ${tracks.length} tracks`);
      }
    } catch (err) {
      toast.error('Failed to load playlist tracks');
    } finally {
      setLoadingPlaylists(false);
    }
  };

  useEffect(() => {
    const tick = () => { setLevels(getLevels()); rafRef.current = requestAnimationFrame(tick); };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [getLevels]);

  // Beat pulse for BPM indicator
  useEffect(() => {
    if (isPlaying && state.active) {
      beatRef.current = setInterval(() => { setBeat(b => !b); }, 500);
    } else {
      clearInterval(beatRef.current);
      setBeat(false);
    }
    return () => clearInterval(beatRef.current);
  }, [isPlaying, state.active]);

  const enable = async () => {
    setForcing(true);
    const ready = activeSource === 'background' ? true : await forceBackgroundPlayback();
    setForcing(false);
    if (!ready) return;
    const ok = init();
    if (!ok) toast.error('DJ engine could not connect — needs audio stream mode');
  };

  const playForDj = async (track: Track, list?: Track[], fromPlaylist = false) => {
    setForcing(true);
    const ready = await forceBackgroundPlayback(track, { trackList: list, fromPlaylist });
    setForcing(false);
    if (ready) init();
    
    // Auto-hide search when playing from results
    setShowSearch(false);
    setResults([]);
  };

  const searchTracks = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-search?q=${encodeURIComponent(query)}`,
        { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
      );
      const data = await res.json();
      setResults(data);
      toast.success(`${data.length} tracks found`);
    } catch { toast.error('Search failed'); }
    finally { setSearching(false); }
  };

  const reset = () => apply({ balance: 0, leftGain: 1, rightGain: 1, low: 0, mid: 0, high: 0, active: state.active });

  const presets = [
    { label: '🔊 Bass Boost', fn: () => apply({ ...state, low: 8, mid: 0, high: -2 }) },
    { label: '🎤 Vocal Pop', fn: () => apply({ ...state, low: -4, mid: 3, high: 5 }) },
    { label: '🎧 Club Mix', fn: () => apply({ ...state, low: 6, mid: -2, high: 4 }) },
    { label: '🌊 Chill', fn: () => apply({ ...state, low: 2, mid: -1, high: -3 }) },
    { label: '⚡ Drop', fn: () => apply({ ...state, low: 12, mid: 0, high: 0 }) },
    { label: '↩ Reset', fn: reset },
  ];

  const totalLevel = (levels.left + levels.right) / 2;

  return (
    <div className="min-h-screen bg-[#030303] text-foreground overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-[160px] animate-pulse"
          style={{ background: `hsl(var(--primary)/0.12)`, animationDuration: '3s' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-[160px] animate-pulse"
          style={{ background: `hsl(var(--primary)/0.08)`, animationDuration: '5s', animationDelay: '1.5s' }} />
        {/* Scanlines */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)' }} />
      </div>

      <Sidebar activeTab="dj" onTabChange={() => {}} />

      <div className="relative z-10 ml-0 md:ml-64 min-h-screen p-4 md:p-8 pb-32">

        {/* ── Header ── */}
        <div className="flex items-center gap-4 mb-8">
          <div className={cn(
            'w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-300',
            state.active ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_30px_hsl(var(--primary)/0.5)]' : 'bg-primary/10 text-primary border-primary/20'
          )}>
            <Headphones className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-5xl font-black tracking-tighter uppercase italic" style={{
              background: 'linear-gradient(135deg, hsl(var(--primary)), #fff, hsl(var(--primary)))',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>DJ Mode</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground/50 mt-1">
              {state.active ? '● LIVE · AUDIO ENGINE ACTIVE' : '○ OFFLINE · ENABLE TO START'}
            </p>
          </div>
          {/* BPM indicator */}
          {state.active && (
            <div className={cn('w-3 h-3 rounded-full transition-all duration-200', beat ? 'bg-primary shadow-[0_0_15px_hsl(var(--primary))]' : 'bg-primary/30')} />
          )}
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(s => !s)}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Tracks
              {showSearch ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            <button
              onClick={state.active ? reset : enable}
              disabled={forcing}
              className={cn(
                'px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2',
                state.active
                  ? 'border border-white/10 bg-white/5 hover:bg-white/10'
                  : 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.4)] hover:scale-105'
              )}
            >
              {forcing ? <Loader2 className="w-4 h-4 animate-spin" /> : state.active ? <RotateCcw className="w-4 h-4" /> : <Power className="w-4 h-4" />}
              {forcing ? 'Loading' : state.active ? 'Reset' : 'Enable DJ'}
            </button>
          </div>
        </div>

        {/* ── Search Drawer ── */}
        {showSearch && (
          <div className="mb-8 p-6 rounded-3xl border border-white/10 bg-white/3 backdrop-blur-xl">
            <form onSubmit={searchTracks} className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search tracks to load into DJ..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-medium focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <button type="submit" disabled={searching}
                className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </form>
            {results.length > 0 && (
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-4">Search Results</p>
                <TrackGrid tracks={results} currentTrack={currentTrack} isPlaying={isPlaying}
                  onPlayTrack={t => playForDj(t, results)} onAddToQueue={handleAddToQueue}
                  isLoading={false} searchPerformed isFavorite={isFavorite} onToggleFavorite={toggleFavorite} />
              </div>
            )}
            
            {userPlaylists.length > 0 && (
              <div className="mb-6">
                 <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-4">Import Your Playlist</p>
                 <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {userPlaylists.map(p => (
                       <button 
                         key={p.id} 
                         onClick={() => loadPlaylistTracks(p.id)}
                         disabled={loadingPlaylists}
                         className="shrink-0 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/50 text-xs font-bold transition-all flex items-center gap-2"
                       >
                         <ListMusic className="w-3.5 h-3.5 text-primary" />
                         {p.name}
                       </button>
                    ))}
                 </div>
              </div>
            )}

            {loadedPlaylistTracks.length > 0 && (
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Imported Playlist Deck</p>
                  <button onClick={() => setLoadedPlaylistTracks([])} className="text-[10px] uppercase font-bold text-muted-foreground hover:text-white">Clear</button>
                </div>
                <TrackGrid tracks={loadedPlaylistTracks} currentTrack={currentTrack} isPlaying={isPlaying}
                  onPlayTrack={t => playForDj(t, loadedPlaylistTracks, true)} onAddToQueue={handleAddToQueue}
                  isLoading={false} searchPerformed isFavorite={isFavorite} onToggleFavorite={toggleFavorite} />
              </div>
            )}

            {playlist.length > 0 && loadedPlaylistTracks.length === 0 && (
              <div className="mt-6">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-4">Up Next Queue Deck</p>
                <TrackGrid tracks={playlist} currentTrack={currentTrack} isPlaying={isPlaying}
                  onPlayTrack={t => playForDj(t, playlist, true)} onAddToQueue={handleAddToQueue}
                  isLoading={false} searchPerformed isFavorite={isFavorite} onToggleFavorite={toggleFavorite} />
              </div>
            )}
          </div>
        )}

        {/* ── Now Playing strip ── */}
        {currentTrack && (
          <div className={cn(
            'mb-8 flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500',
            state.active ? 'border-primary/30 bg-primary/5' : 'border-white/5 bg-white/3'
          )}>
            <div className="relative shrink-0">
              <img src={currentTrack.thumbnail} className="w-12 h-12 rounded-xl object-cover" />
              {isPlaying && state.active && (
                <div className="absolute -inset-1 rounded-xl border-2 border-primary animate-ping opacity-40" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm truncate">{currentTrack.title}</p>
              <p className="text-xs text-muted-foreground/60 truncate uppercase tracking-widest">{currentTrack.channel}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full', activeSource === 'background' ? 'bg-primary animate-pulse' : 'bg-red-500')} />
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {activeSource === 'background' ? 'DJ Stream' : 'Not DJ'}
              </span>
            </div>
            {activeSource !== 'background' && (
              <button onClick={enable} disabled={forcing}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2">
                {forcing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                Force DJ
              </button>
            )}
          </div>
        )}

        {/* ── Main DJ Console ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_auto_1fr] gap-4 mb-6">

          {/* Deck L */}
          {(['L', 'R'] as const).map((side, i) => {
            const gain = side === 'L' ? state.leftGain : state.rightGain;
            const level = side === 'L' ? levels.left : levels.right;
            return (
              <div key={side} className={cn(
                'relative rounded-[2rem] border overflow-hidden p-6 flex flex-col gap-5 transition-all duration-300',
                state.active && level > 0.3 ? 'border-primary/40' : 'border-white/8',
                'bg-gradient-to-b from-white/3 to-transparent backdrop-blur-xl'
              )}
                style={{
                  boxShadow: state.active ? `0 0 ${20 + level * 40}px hsl(var(--primary)/${0.05 + level * 0.15})` : 'none'
                }}>

                {/* Deck label */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-muted-foreground">
                    {side === 'L' ? '« ' : ''}Deck {side}{side === 'R' ? ' »' : ''}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className={cn('w-1 h-1 rounded-full', j / 3 < level ? 'bg-primary' : 'bg-white/10')} />
                    ))}
                  </div>
                </div>

                {/* Vinyl */}
                <div className="flex justify-center py-2">
                  <Vinyl spinning={isPlaying && state.active} level={level} side={side} />
                </div>

                {/* VU Meter */}
                <VuMeter level={level} />

                {/* Channel Volume */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground">Channel Volume</span>
                    <span className="text-xs font-black text-primary tabular-nums">{Math.round(gain * 100)}%</span>
                  </div>
                  <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-100"
                      style={{ width: `${(gain / 1.5) * 100}%`, background: 'linear-gradient(90deg, hsl(var(--primary)), #fff)' }} />
                    <input type="range" min={0} max={150} step={1} value={Math.round(gain * 100)}
                      onChange={e => apply({ ...state, ...(side === 'L' ? { leftGain: +e.target.value / 100 } : { rightGain: +e.target.value / 100 }) })}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full" />
                  </div>
                  {/* +/- buttons */}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => apply({ ...state, ...(side === 'L' ? { leftGain: Math.max(0, gain - 0.1) } : { rightGain: Math.max(0, gain - 0.1) }) })}
                      className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-black transition-all active:scale-95">−</button>
                    <button
                      onClick={() => apply({ ...state, ...(side === 'L' ? { leftGain: Math.min(1.5, gain + 0.1) } : { rightGain: Math.min(1.5, gain + 0.1) }) })}
                      className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-black transition-all active:scale-95">+</button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Center Column: Crossfader + Master ── */}
          <div className="flex flex-col gap-4 xl:w-64">
            {/* Master level */}
            <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-xl p-5 flex flex-col items-center gap-3">
              <Activity className="w-5 h-5 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground">Master Level</span>
              <VuMeter level={totalLevel} />
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-primary transition-all duration-75 rounded-full"
                  style={{ width: `${totalLevel * 100}%` }} />
              </div>
            </div>

            {/* Crossfader */}
            <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground">Crossfader</span>
                <span className="text-[10px] font-black text-primary">
                  {state.balance === 0 ? 'CENTER' : state.balance < 0 ? `${Math.round(-state.balance * 100)}% L` : `${Math.round(state.balance * 100)}% R`}
                </span>
              </div>
              <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="absolute inset-y-0 rounded-full transition-all duration-75"
                  style={{
                    left: `${state.balance <= 0 ? 50 + state.balance * 50 : 50}%`,
                    right: `${state.balance >= 0 ? 50 - state.balance * 50 : 50}%`,
                    background: 'hsl(var(--primary))',
                    minWidth: 4
                  }} />
                <input type="range" min={-100} max={100} step={1} value={Math.round(state.balance * 100)}
                  onChange={e => apply({ ...state, balance: +e.target.value / 100 })}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full" />
              </div>
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                <span>L</span><span>Mix</span><span>R</span>
              </div>
              {/* Crossfader quick buttons */}
              <div className="flex gap-1.5 pt-1">
                {[['◄◄ L', -1], ['Center', 0], ['R ►►', 1]].map(([lbl, val]) => (
                  <button key={String(lbl)} onClick={() => apply({ ...state, balance: +val })}
                    className="flex-1 py-1.5 rounded-xl bg-white/5 hover:bg-primary/20 hover:text-primary text-[9px] font-black uppercase tracking-widest transition-all active:scale-95">
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {/* EQ */}
            <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-xl p-5 space-y-3 flex-1">
              <div className="flex items-center gap-2">
                <Music2 className="w-4 h-4 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-[0.4em] text-muted-foreground">3-Band EQ</span>
              </div>
              <div className="flex justify-around items-start pt-2">
                <EQFader label="Bass" value={state.low} onChange={v => apply({ ...state, low: v })} />
                <EQFader label="Mid" value={state.mid} onChange={v => apply({ ...state, mid: v })} />
                <EQFader label="High" value={state.high} onChange={v => apply({ ...state, high: v })} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Presets ── */}
        <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-xl p-5">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-muted-foreground mb-4">Quick Presets</p>
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button key={p.label} onClick={p.fn}
                className="px-5 py-2.5 rounded-2xl border border-white/10 bg-white/5 hover:bg-primary/20 hover:border-primary/40 hover:text-primary text-xs font-black uppercase tracking-widest transition-all active:scale-95">
                {p.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DjMode;
