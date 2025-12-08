# 🚀 Setup Completo - Novo Projeto Supabase

## 📋 Passo 1: Criar Novo Projeto no Supabase

1. Acesse: **https://supabase.com/dashboard**
2. Clique em **"New Project"**
3. Preencha:
   - **Name**: `ScrimForge CS2` (ou o nome que preferir)
   - **Database Password**: Escolha uma senha forte (anote ela!)
   - **Region**: Escolha o mais próximo (ex: South America)
4. Clique em **"Create new project"**
5. Aguarde ~2 minutos enquanto o projeto é criado

---

## 📋 Passo 2: Obter as Credenciais

1. Após o projeto ser criado, vá em **Settings** (⚙️ no menu lateral)
2. Clique em **API**
3. Você verá:
   - **Project URL**: `https://xxxxxxxxxxx.supabase.co`
   - **Project API keys**:
     - `anon` `public` → Esta é sua **PUBLISHABLE KEY**

4. Copie essas informações

---

## 📋 Passo 3: Configurar Variáveis de Ambiente

### Localmente (.env):

1. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` com suas credenciais:
   ```env
   VITE_SUPABASE_URL=https://SEU-PROJECT-ID.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=SUA-CHAVE-PUBLICA
   VITE_SUPABASE_PROJECT_ID=SEU-PROJECT-ID
   ```

### Na Vercel:

1. Acesse seu projeto na Vercel
2. Vá em **Settings** → **Environment Variables**
3. Adicione as 3 variáveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
4. Salve e faça **Redeploy** do projeto

---

## 📋 Passo 4: Criar as Tabelas no Banco de Dados

### 4.1 - Tabela `rooms`

1. No Supabase, vá em **SQL Editor** (📝 no menu lateral)
2. Clique em **"New Query"**
3. Cole este SQL:

```sql
-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can create rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON public.rooms FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete rooms" ON public.rooms FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
```

4. Clique em **"Run"** ✅

### 4.2 - Tabela `players`

1. Ainda no **SQL Editor**, clique em **"New Query"** novamente
2. Cole este SQL:

```sql
-- Create players table
CREATE TABLE IF NOT EXISTS public.players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  session_id TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, session_id)
);

-- Enable RLS
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view players" ON public.players FOR SELECT USING (true);
CREATE POLICY "Anyone can create players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update players" ON public.players FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete players" ON public.players FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;

-- Create index
CREATE INDEX IF NOT EXISTS idx_players_room_id ON public.players(room_id);
CREATE INDEX IF NOT EXISTS idx_players_session_id ON public.players(session_id);
```

3. Clique em **"Run"** ✅

### 4.3 - Tabela `match_state`

1. Ainda no **SQL Editor**, clique em **"New Query"** mais uma vez
2. Cole este SQL:

```sql
-- Create match_state table to store team division and map bans in real-time
CREATE TABLE IF NOT EXISTS public.match_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE UNIQUE,

  -- Configuration
  team_format TEXT NOT NULL DEFAULT '5v5',
  match_format TEXT NOT NULL DEFAULT 'md1',
  current_step TEXT NOT NULL DEFAULT 'config',

  -- Teams
  team_a_name TEXT DEFAULT 'Time A',
  team_a_players JSONB DEFAULT '[]'::jsonb,
  team_a_captain_id TEXT,

  team_b_name TEXT DEFAULT 'Time B',
  team_b_players JSONB DEFAULT '[]'::jsonb,
  team_b_captain_id TEXT,

  -- Map ban state
  maps JSONB DEFAULT '[]'::jsonb,
  current_turn TEXT DEFAULT 'teamA',
  ban_history JSONB DEFAULT '[]'::jsonb,

  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Anyone can view match state" ON public.match_state;
DROP POLICY IF EXISTS "Anyone can create match state" ON public.match_state;
DROP POLICY IF EXISTS "Anyone can update match state" ON public.match_state;
DROP POLICY IF EXISTS "Anyone can delete match state" ON public.match_state;

CREATE POLICY "Anyone can view match state" ON public.match_state FOR SELECT USING (true);
CREATE POLICY "Anyone can create match state" ON public.match_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update match state" ON public.match_state FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete match state" ON public.match_state FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_state;

-- Create index
CREATE INDEX IF NOT EXISTS idx_match_state_room_id ON public.match_state(room_id);

-- Function to update timestamp
CREATE OR REPLACE FUNCTION update_match_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS match_state_updated_at ON public.match_state;
CREATE TRIGGER match_state_updated_at
  BEFORE UPDATE ON public.match_state
  FOR EACH ROW
  EXECUTE FUNCTION update_match_state_updated_at();
```

3. Clique em **"Run"** ✅

---

## 📋 Passo 5: Verificar se Tudo Está OK

1. No Supabase, vá em **Table Editor** (📊 no menu lateral)
2. Você deve ver 3 tabelas:
   - ✅ `rooms`
   - ✅ `players`
   - ✅ `match_state`

3. Se todas aparecerem, está tudo certo! 🎉

---

## 📋 Passo 6: Testar a Aplicação

### Localmente:

```bash
npm run dev
```

### Deploy na Vercel:

```bash
npm run build
git add .
git commit -m "Setup novo projeto Supabase"
git push
```

Ou faça upload manual na Vercel.

---

## ✅ Checklist Final

- [ ] Projeto Supabase criado
- [ ] Credenciais copiadas
- [ ] Arquivo `.env` configurado localmente
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Tabela `rooms` criada ✅
- [ ] Tabela `players` criada ✅
- [ ] Tabela `match_state` criada ✅
- [ ] Build funcionando sem erros
- [ ] Deploy feito na Vercel

---

## 🎮 Pronto para Usar!

Agora sua aplicação está 100% funcional com:
- ✅ Sistema de salas
- ✅ Jogadores em tempo real
- ✅ Divisão de times 2v2, 3v3, 4v4, 5v5
- ✅ Ban de mapas MD1, MD3, MD5
- ✅ Capitães votando sozinhos
- ✅ Sincronização em tempo real

**Divirta-se!** 🚀
