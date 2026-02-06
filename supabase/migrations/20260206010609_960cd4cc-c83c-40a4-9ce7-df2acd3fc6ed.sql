-- Create game_sessions table to track user game activity
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  game_name TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  gems_collected INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  track_playing TEXT,
  track_source TEXT, -- 'favorites' or 'playlist'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own game sessions" 
ON public.game_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert their own game sessions" 
ON public.game_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update their own game sessions" 
ON public.game_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_game_sessions_user_id ON public.game_sessions(user_id);
CREATE INDEX idx_game_sessions_started_at ON public.game_sessions(started_at DESC);
CREATE INDEX idx_game_sessions_is_active ON public.game_sessions(is_active);

-- Enable realtime for game sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;