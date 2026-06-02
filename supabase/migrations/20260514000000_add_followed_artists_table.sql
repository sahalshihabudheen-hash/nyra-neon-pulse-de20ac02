
-- Create followed_artists table
CREATE TABLE IF NOT EXISTS public.followed_artists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    artist_id TEXT NOT NULL,
    artist_name TEXT NOT NULL,
    artist_photo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, artist_id)
);

-- Enable RLS
ALTER TABLE public.followed_artists ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own followed artists"
    ON public.followed_artists FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can follow artists"
    ON public.followed_artists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow artists"
    ON public.followed_artists FOR DELETE
    USING (auth.uid() = user_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE followed_artists;
