
-- 1. Quick Notes table
CREATE TABLE public.quick_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  date TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quick_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quick_notes" ON public.quick_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quick_notes" ON public.quick_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quick_notes" ON public.quick_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quick_notes" ON public.quick_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 2. Journal Entries table
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own journal_entries" ON public.journal_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own journal_entries" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journal_entries" ON public.journal_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own journal_entries" ON public.journal_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. Focus Sessions table
CREATE TABLE public.focus_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task TEXT NOT NULL,
  planned_duration INTEGER NOT NULL,
  focused_duration INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  date TEXT NOT NULL,
  linked_activity_id TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own focus_sessions" ON public.focus_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own focus_sessions" ON public.focus_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. Mental Dumps (Unlock Sessions) table
CREATE TABLE public.mental_dumps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  input_text TEXT NOT NULL,
  vision_interior TEXT,
  actividades JSONB DEFAULT '[]'::jsonb,
  consejo_disciplina TEXT,
  started_focus_time BOOLEAN NOT NULL DEFAULT false,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mental_dumps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mental_dumps" ON public.mental_dumps FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mental_dumps" ON public.mental_dumps FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mental_dumps" ON public.mental_dumps FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 5. Floating Notes table (separate from quick_notes in schedule)
CREATE TABLE public.floating_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.floating_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own floating_notes" ON public.floating_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own floating_notes" ON public.floating_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own floating_notes" ON public.floating_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own floating_notes" ON public.floating_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. App Sessions (time tracking) table
CREATE TABLE public.app_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own app_sessions" ON public.app_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own app_sessions" ON public.app_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own app_sessions" ON public.app_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
