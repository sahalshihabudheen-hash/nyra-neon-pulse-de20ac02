import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

interface Artist {
  id: string;
  user_id: string;
  artist_name: string;
  bio: string | null;
  profile_image_url: string | null;
  created_at: string;
}

interface Album {
  id: string;
  artist_id: string;
  album_name: string;
  cover_image_url: string | null;
  created_at: string;
}

interface Song {
  id: string;
  album_id: string;
  title: string;
  description: string | null;
  audio_url: string;
  duration: number | null;
  created_at: string;
}

export const useArtist = () => {
  const { user } = useAuth();
  const [myArtistProfile, setMyArtistProfile] = useState<Artist | null>(null);
  const [myAlbums, setMyAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchMyArtistProfile();
    } else {
      setMyArtistProfile(null);
      setMyAlbums([]);
      setLoading(false);
    }
  }, [user]);

  const fetchMyArtistProfile = async () => {
    if (!user) return;
    
    try {
      const { data: artist, error } = await supabase
        .from("artists")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setMyArtistProfile(artist);

      if (artist) {
        const { data: albums } = await supabase
          .from("albums")
          .select("*")
          .eq("artist_id", artist.id)
          .order("created_at", { ascending: false });

        setMyAlbums(albums || []);
      }
    } catch (error) {
      console.error("Error fetching artist profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const registerAsArtist = async (artistName: string, bio?: string) => {
    if (!user) {
      toast.error("Please login first");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("artists")
        .insert({ user_id: user.id, artist_name: artistName, bio })
        .select()
        .single();

      if (error) throw error;
      
      setMyArtistProfile(data);
      toast.success("Artist profile created!");
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to create artist profile");
      return null;
    }
  };

  const createAlbum = async (albumName: string, coverFile?: File) => {
    if (!myArtistProfile) {
      toast.error("Create an artist profile first");
      return null;
    }

    try {
      let coverImageUrl = null;

      if (coverFile) {
        const fileExt = coverFile.name.split(".").pop();
        const fileName = `${myArtistProfile.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("album-covers")
          .upload(fileName, coverFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("album-covers")
          .getPublicUrl(fileName);

        coverImageUrl = urlData.publicUrl;
      }

      const { data, error } = await supabase
        .from("albums")
        .insert({
          artist_id: myArtistProfile.id,
          album_name: albumName,
          cover_image_url: coverImageUrl,
        })
        .select()
        .single();

      if (error) throw error;

      setMyAlbums((prev) => [data, ...prev]);
      toast.success("Album created!");
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to create album");
      return null;
    }
  };

  const uploadSong = async (albumId: string, title: string, audioFile: File, description?: string) => {
    if (!myArtistProfile) {
      toast.error("Create an artist profile first");
      return null;
    }

    try {
      const fileExt = audioFile.name.split(".").pop();
      const fileName = `${myArtistProfile.id}/${albumId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("artist-songs")
        .upload(fileName, audioFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("artist-songs")
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from("songs")
        .insert({
          album_id: albumId,
          title,
          description,
          audio_url: urlData.publicUrl,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Song uploaded!");
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to upload song");
      return null;
    }
  };

  const updateAlbum = async (albumId: string, albumName: string, coverFile?: File) => {
    if (!myArtistProfile) return null;

    try {
      let coverImageUrl = undefined;

      if (coverFile) {
        const fileExt = coverFile.name.split(".").pop();
        const fileName = `${myArtistProfile.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("album-covers")
          .upload(fileName, coverFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("album-covers")
          .getPublicUrl(fileName);

        coverImageUrl = urlData.publicUrl;
      }

      const updateData: any = { album_name: albumName };
      if (coverImageUrl) updateData.cover_image_url = coverImageUrl;

      const { data, error } = await supabase
        .from("albums")
        .update(updateData)
        .eq("id", albumId)
        .select()
        .single();

      if (error) throw error;

      setMyAlbums((prev) => prev.map((a) => (a.id === albumId ? data : a)));
      toast.success("Album updated!");
      return data;
    } catch (error: any) {
      toast.error(error.message || "Failed to update album");
      return null;
    }
  };

  const deleteAlbum = async (albumId: string) => {
    if (!myArtistProfile) {
      toast.error("No artist profile found");
      return false;
    }

    try {
      // First delete all songs in the album
      const { error: songsError } = await supabase
        .from("songs")
        .delete()
        .eq("album_id", albumId);

      if (songsError) throw songsError;

      // Then delete the album
      const { error } = await supabase
        .from("albums")
        .delete()
        .eq("id", albumId);

      if (error) throw error;

      setMyAlbums((prev) => prev.filter((a) => a.id !== albumId));
      toast.success("Album deleted!");
      return true;
    } catch (error: any) {
      toast.error(error.message || "Failed to delete album");
      return false;
    }
  };

  return {
    myArtistProfile,
    myAlbums,
    loading,
    registerAsArtist,
    createAlbum,
    uploadSong,
    updateAlbum,
    deleteAlbum,
    refetch: fetchMyArtistProfile,
  };
};

export const useAllArtists = () => {
  const [artists, setArtists] = useState<(Artist & { albums: (Album & { songs: Song[] })[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllArtists();
  }, []);

  const fetchAllArtists = async () => {
    try {
      const { data: artistsData, error: artistsError } = await supabase
        .from("artists")
        .select("*")
        .order("created_at", { ascending: false });

      if (artistsError) throw artistsError;

      const artistsWithAlbums = await Promise.all(
        (artistsData || []).map(async (artist) => {
          const { data: albums } = await supabase
            .from("albums")
            .select("*")
            .eq("artist_id", artist.id)
            .order("created_at", { ascending: false });

          const albumsWithSongs = await Promise.all(
            (albums || []).map(async (album) => {
              const { data: songs } = await supabase
                .from("songs")
                .select("*")
                .eq("album_id", album.id)
                .order("created_at", { ascending: true });

              return { ...album, songs: songs || [] };
            })
          );

          return { ...artist, albums: albumsWithSongs };
        })
      );

      setArtists(artistsWithAlbums);
    } catch (error) {
      console.error("Error fetching artists:", error);
    } finally {
      setLoading(false);
    }
  };

  return { artists, loading, refetch: fetchAllArtists };
};

export const useArtistById = (artistId: string | undefined) => {
  const [artist, setArtist] = useState<Artist | null>(null);
  const [albums, setAlbums] = useState<(Album & { songs: Song[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (artistId) {
      fetchArtist();
    }
  }, [artistId]);

  const fetchArtist = async () => {
    if (!artistId) return;

    try {
      const { data: artistData, error: artistError } = await supabase
        .from("artists")
        .select("*")
        .eq("id", artistId)
        .single();

      if (artistError) throw artistError;
      setArtist(artistData);

      const { data: albumsData } = await supabase
        .from("albums")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });

      const albumsWithSongs = await Promise.all(
        (albumsData || []).map(async (album) => {
          const { data: songs } = await supabase
            .from("songs")
            .select("*")
            .eq("album_id", album.id)
            .order("created_at", { ascending: true });

          return { ...album, songs: songs || [] };
        })
      );

      setAlbums(albumsWithSongs);
    } catch (error) {
      console.error("Error fetching artist:", error);
    } finally {
      setLoading(false);
    }
  };

  return { artist, albums, loading, refetch: fetchArtist };
};
