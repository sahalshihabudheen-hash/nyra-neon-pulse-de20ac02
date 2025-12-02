import { useState } from 'react';
import { Play, Trash2, Shuffle, Repeat, Repeat1, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePlaylist } from '@/hooks/usePlaylist';
import { cn } from '@/lib/utils';
import Navbar from '@/components/Navbar';
import MusicPlayer from '@/components/MusicPlayer';

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
}

const Playlist = () => {
  const navigate = useNavigate();
  const {
    playlist,
    removeFromPlaylist,
    clearPlaylist,
    shuffleMode,
    toggleShuffle,
    loopMode,
    cycleLoopMode,
  } = usePlaylist();

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handlePlayTrack = (track: Track) => {
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (!currentTrack || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentTrack(playlist[nextIndex]);
  };

  const handlePrevious = () => {
    if (!currentTrack || playlist.length === 0) return;
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex <= 0 ? playlist.length - 1 : currentIndex - 1;
    setCurrentTrack(playlist[prevIndex]);
  };

  const getLoopIcon = () => {
    switch (loopMode) {
      case 'one':
        return <Repeat1 className="w-5 h-5" />;
      case 'all':
        return <Repeat className="w-5 h-5" />;
      default:
        return <Repeat className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={() => {}}
      />
      
      <main className="flex-1 md:ml-64 pt-20 pb-32 px-4 md:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold neon-text mb-2">Your Playlist</h1>
              <p className="text-muted-foreground">{playlist.length} tracks</p>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleShuffle}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  shuffleMode
                    ? 'bg-primary text-primary-foreground neon-glow'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
                title="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
              </button>
              
              <button
                onClick={cycleLoopMode}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  loopMode !== 'off'
                    ? 'bg-primary text-primary-foreground neon-glow'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                )}
                title={`Loop: ${loopMode}`}
              >
                {getLoopIcon()}
              </button>
              
              {playlist.length > 0 && (
                <button
                  onClick={clearPlaylist}
                  className="px-4 py-2 text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-full transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Playlist */}
        {playlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Play className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-xl font-medium">Your playlist is empty</p>
            <p className="text-sm">Add songs from the home page to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {playlist.map((track, index) => (
              <div
                key={track.id}
                className={cn(
                  'flex items-center gap-4 p-4 rounded-xl transition-all group',
                  currentTrack?.id === track.id
                    ? 'bg-primary/20 border border-primary/30'
                    : 'bg-card hover:bg-card/80 border border-transparent'
                )}
              >
                {/* Index/Playing indicator */}
                <div className="w-8 text-center">
                  {currentTrack?.id === track.id ? (
                    <div className="flex items-center justify-center gap-0.5">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 bg-primary rounded-full soundwave-bar"
                          style={{ height: '16px' }}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground font-medium">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* Thumbnail */}
                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'font-semibold truncate text-lg',
                      currentTrack?.id === track.id ? 'text-primary' : 'text-foreground'
                    )}
                  >
                    {track.title}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">{track.channel}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handlePlayTrack(track)}
                    className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-105 transition-transform neon-glow"
                  >
                    <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                  </button>
                  <button
                    onClick={() => removeFromPlaylist(track.id)}
                    className="w-11 h-11 rounded-full bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive/20 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {currentTrack && (
        <MusicPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrevious={handlePrevious}
          playlist={playlist}
          onPlayFromPlaylist={handlePlayTrack}
          onRemoveFromPlaylist={removeFromPlaylist}
          onClearPlaylist={clearPlaylist}
        />
      )}
    </div>
  );
};

export default Playlist;
