-- EXECUTE ESTE SQL NO SUPABASE PARA CORRIGIR AS POLICIES

-- Remove todas as policies antigas
DROP POLICY IF EXISTS "Anyone can view match state" ON public.match_state;
DROP POLICY IF EXISTS "Anyone can create match state" ON public.match_state;
DROP POLICY IF EXISTS "Anyone can update match state" ON public.match_state;
DROP POLICY IF EXISTS "Anyone can delete match state" ON public.match_state;

-- Desabilita RLS temporariamente para debug
ALTER TABLE public.match_state DISABLE ROW LEVEL SECURITY;

-- OU se quiser manter RLS, recrie as policies corretamente:
ALTER TABLE public.match_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
  ON public.match_state FOR SELECT
  USING (true);

CREATE POLICY "Enable insert for all users"
  ON public.match_state FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable update for all users"
  ON public.match_state FOR UPDATE
  USING (true);

CREATE POLICY "Enable delete for all users"
  ON public.match_state FOR DELETE
  USING (true);
