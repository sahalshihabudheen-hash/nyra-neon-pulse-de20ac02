
CREATE TABLE public.admin_chat_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.admin_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.admin_chat_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reactions"
  ON public.admin_chat_reactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can add reactions"
  ON public.admin_chat_reactions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

CREATE POLICY "Admins can remove own reactions"
  ON public.admin_chat_reactions FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_chat_reactions;
