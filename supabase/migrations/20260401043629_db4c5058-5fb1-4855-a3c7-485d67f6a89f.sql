
-- Create admin chat messages table
CREATE TABLE public.admin_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'gif', 'sticker', 'voice')),
  content TEXT,
  media_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_chat_messages ENABLE ROW LEVEL SECURITY;

-- Only admins can read chat messages
CREATE POLICY "Admins can view chat messages"
  ON public.admin_chat_messages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Only admins can send chat messages
CREATE POLICY "Admins can send chat messages"
  ON public.admin_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

-- Admins can delete their own messages
CREATE POLICY "Admins can delete own chat messages"
  ON public.admin_chat_messages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_chat_messages;

-- Create storage bucket for chat media
INSERT INTO storage.buckets (id, name, public) VALUES ('admin-chat', 'admin-chat', true);

-- Storage policies for admin-chat bucket
CREATE POLICY "Admins can upload chat media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'admin-chat' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view chat media"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'admin-chat');
