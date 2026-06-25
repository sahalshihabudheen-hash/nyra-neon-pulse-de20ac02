
ALTER TABLE public.admin_chat_messages ADD COLUMN reply_to UUID REFERENCES public.admin_chat_messages(id) ON DELETE SET NULL DEFAULT NULL;

CREATE TABLE public.admin_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  admin_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_details TEXT,
  target_user_id UUID,
  target_email TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Main admin can view all logs"
  ON public.admin_activity_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert logs"
  ON public.admin_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = admin_id);
