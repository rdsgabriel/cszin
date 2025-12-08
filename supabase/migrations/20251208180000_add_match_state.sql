-- Create match_state table to store team division and map bans in real-time
CREATE TABLE public.match_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE UNIQUE,

  -- Configuration
  team_format TEXT NOT NULL DEFAULT '5v5', -- '3v3', '4v4', '5v5'
  match_format TEXT NOT NULL DEFAULT 'md1', -- 'md1', 'md3', 'md5'
  current_step TEXT NOT NULL DEFAULT 'config', -- 'config', 'teams', 'ban', 'result'

  -- Teams
  team_a_name TEXT DEFAULT 'Time A',
  team_a_players JSONB DEFAULT '[]'::jsonb,
  team_a_captain_id TEXT,

  team_b_name TEXT DEFAULT 'Time B',
  team_b_players JSONB DEFAULT '[]'::jsonb,
  team_b_captain_id TEXT,

  -- Map ban state
  maps JSONB DEFAULT '[]'::jsonb, -- Array of {id, status, pickedBy}
  current_turn TEXT DEFAULT 'teamA', -- 'teamA' or 'teamB'
  ban_history JSONB DEFAULT '[]'::jsonb, -- Array of {team, mapName, action}

  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies (public access for this game lobby)
CREATE POLICY "Anyone can view match state" ON public.match_state FOR SELECT USING (true);
CREATE POLICY "Anyone can create match state" ON public.match_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update match state" ON public.match_state FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete match state" ON public.match_state FOR DELETE USING (true);

-- Enable realtime for match_state table
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_state;

-- Create index for faster lookups
CREATE INDEX idx_match_state_room_id ON public.match_state(room_id);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_match_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER match_state_updated_at
  BEFORE UPDATE ON public.match_state
  FOR EACH ROW
  EXECUTE FUNCTION update_match_state_updated_at();
