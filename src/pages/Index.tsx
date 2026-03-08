import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '@/components/SplashScreen';
import JarvisTutorial from '@/components/JarvisTutorial';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import TrackGrid from '@/components/TrackGrid';
import MusicPlayer from '@/components/MusicPlayer';
import TrendingSection from '@/components/TrendingSection';
import HeroSection from '@/components/HeroSection';
import PersonalizedSection from '@/components/PersonalizedSection';
import GenreOnboarding from '@/components/GenreOnboarding';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useMusicPlayer } from '@/contexts/MusicPlayerContext';
import { famousSongs } from '@/data/famousSongs';

const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const {
    currentTrack, isPlaying, ytPlayerRef, audioRef,
    handlePlayTrack, handlePlayPause, handleNext, handlePrevious,
    handlePlayFromPlaylist, handlePlayFromQueue,
    handleAddToPlaylist, handleAddToQueue,
    handleRemoveFromPlaylist, handleClearPlaylist,
    playlist, queue, isInPlaylist, removeFromQueue, reorderPlaylist,
    shuffleMode, toggleShuffle,
    isFavorite, toggleFavorite,
    tracks, setTracks,
    setShowMiniPlayer,
  } = useMusicPlayer();

  const { preferences, showOnboarding, savePreferences } = useUserPreferences();
  const { location } = useUserLocation();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Show famous songs by default
  useEffect(() => {
    if (!searchPerformed && tracks.length === 0) {
      setTracks(famousSongs);
    }
  }, [searchPerformed, tracks.length, setTracks]);

  // On home page, ensure mini player is hidden (full player is visible)
  useEffect(() => {
    setShowMiniPlayer(true);
  }, [setShowMiniPlayer]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setSearchPerformed(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/youtube-search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );

      if (!response.ok) throw new Error('Search failed');
      const results = await response.json();
      if (results.error) throw new Error(results.error);

      setTracks(results);
      toast.success(`Found ${results.length} tracks`);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-background/80 gradient-bg noise-overlay">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="ml-0 md:ml-64">
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearch={handleSearch}
        />

        <main className="pt-24 md:pt-28 pb-48 md:pb-36 px-4 md:px-8">
          {/* Genre Onboarding Dialog */}
          <GenreOnboarding
            open={showOnboarding && !showSplash}
            onComplete={savePreferences}
          />

          {/* Hero Section - only on home without search */}
          {!searchPerformed && (
            <HeroSection 
              onPlayTrack={handlePlayTrack}
            />
          )}

          {/* Trending Section */}
          {!searchPerformed && (
            <TrendingSection 
              onPlayTrack={handlePlayTrack}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onAddToQueue={handleAddToQueue}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          )}

          {/* Regional Songs Section */}
          {!searchPerformed && location?.country && (
            <PersonalizedSection
              title={`Hits from ${location.state || location.country}`}
              subtitle={`Popular songs in ${location.city ? `${location.city}, ` : ''}${location.state || location.country}`}
              icon="regional"
              searchParams={{ type: 'regional', state: location.state || '', country: location.country || '' }}
              onPlayTrack={handlePlayTrack}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onAddToQueue={handleAddToQueue}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          )}

          {/* Genre-based Section from preferences */}
          {!searchPerformed && preferences?.genres && preferences.genres.length > 0 && (
            <PersonalizedSection
              title={`Because you love ${preferences.genres[0]}`}
              subtitle={`Handpicked ${preferences.genres[0]} tracks for you`}
              icon="genre"
              searchParams={{ type: 'genre', genre: preferences.genres[0] }}
              onPlayTrack={handlePlayTrack}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              onAddToQueue={handleAddToQueue}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
            />
          )}

          {searchPerformed && tracks.length > 0 && (
            <div className="mb-8 animate-in-up">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Search Results
              </h1>
              <p className="text-muted-foreground">
                Found {tracks.length} tracks for "<span className="text-primary">{searchQuery}</span>"
              </p>
            </div>
          )}

          {!searchPerformed && (
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1 h-8 rounded-full bg-primary" />
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Popular Songs
                </h2>
              </div>
              <p className="text-muted-foreground ml-4">
                Discover trending hits and popular tracks
              </p>
            </div>
          )}

          <TrackGrid
            tracks={tracks}
            currentTrack={currentTrack}
            onPlayTrack={handlePlayTrack}
            onAddToQueue={handleAddToQueue}
            isLoading={isLoading}
            searchPerformed={searchPerformed}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        </main>
      </div>

      <MusicPlayer
        currentTrack={currentTrack}
        isPlaying={isPlaying}
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
        audioRef={audioRef}
        shuffleMode={shuffleMode}
        onToggleShuffle={toggleShuffle}
        queue={queue}
        onRemoveFromQueue={removeFromQueue}
        onPlayFromQueue={handlePlayFromQueue}
      />
    </div>
  );
};

export default Index;
