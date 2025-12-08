import { PlayerAvatar } from "@/components/PlayerAvatar";

interface Player {
  id: string;
  nickname: string;
  session_id: string;
  joined_at: string;
}

interface LobbyRosterProps {
  players: Player[];
  adminSessionId: string;
  currentSessionId: string;
  maxPlayers?: number;
}

export function LobbyRoster({ players, adminSessionId, currentSessionId, maxPlayers = 10 }: LobbyRosterProps) {
  return (
    <div className="tactical-card p-6 border border-border hover-glow-gold">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground uppercase tracking-wider">
            Jogadores Conectados
          </h2>
          <p className="text-sm text-muted-foreground">
            Lobby Roster
          </p>
        </div>
        <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg border border-border">
          <span className="text-2xl font-bold text-primary">{players.length}</span>
          <span className="text-sm text-muted-foreground">/{maxPlayers}</span>
        </div>
      </div>

      {/* Player List */}
      <div className="space-y-3">
        {players.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p>Aguardando jogadores...</p>
          </div>
        ) : (
          players.map((player, index) => {
            const isAdmin = player.session_id === adminSessionId;
            const isYou = player.session_id === currentSessionId;

            return (
              <div
                key={player.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 border border-border/50 hover:border-border transition-colors animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <PlayerAvatar nickname={player.nickname} isAdmin={isAdmin} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground truncate">
                      {player.nickname}
                    </span>
                    {isYou && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        Você
                      </span>
                    )}
                    {isAdmin && (
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        Admin
                      </span>
                    )}
                  </div>
                </div>

                {/* Online indicator */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer info */}
      {players.length > 0 && players.length < maxPlayers && (
        <div className="mt-6 pt-4 border-t border-border/50 text-center">
          <p className="text-sm text-muted-foreground">
            Aguardando mais <span className="text-primary font-semibold">{maxPlayers - players.length}</span> jogadores para completar
          </p>
        </div>
      )}

      {players.length >= maxPlayers && (
        <div className="mt-6 pt-4 border-t border-primary/30 text-center">
          <p className="text-sm text-primary font-semibold animate-pulse">
            ✓ Lobby completo! Pronto para configurar a partida.
          </p>
        </div>
      )}
    </div>
  );
}
