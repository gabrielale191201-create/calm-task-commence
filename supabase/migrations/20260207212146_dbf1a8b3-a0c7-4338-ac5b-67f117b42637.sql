-- Tabla para almacenar la conexión Telegram del usuario
CREATE TABLE public.user_telegram (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  telegram_chat_id TEXT,
  telegram_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_telegram ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own telegram connection"
ON public.user_telegram FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own telegram connection"
ON public.user_telegram FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own telegram connection"
ON public.user_telegram FOR UPDATE
USING (auth.uid() = user_id);

-- Tabla para códigos de enlace temporales
CREATE TABLE public.telegram_link_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_link_codes ENABLE ROW LEVEL SECURITY;

-- Policies - usuarios pueden ver sus propios códigos
CREATE POLICY "Users can view own link codes"
ON public.telegram_link_codes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own link codes"
ON public.telegram_link_codes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger para updated_at en user_telegram
CREATE TRIGGER update_user_telegram_updated_at
BEFORE UPDATE ON public.user_telegram
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();