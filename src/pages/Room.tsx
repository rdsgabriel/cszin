import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TacticalBackground } from "@/components/TacticalBackground";
import { RoomHeader } from "@/components/RoomHeader";
import { LobbyRoster } from "@/components/LobbyRoster";
import { NicknameModal } from "@/components/NicknameModal";
import { TeamDivisionRealtime } from "@/components/TeamDivisionRealtime";
import { Button } from "@/components/ui/button";
import { getSessionId, getNicknameForRoom, setNicknameForRoom } from "@/lib/roomUtils";
import { toast } from "sonner";

interface Room {
  id: string;
  admin_id: string;
  created_at: string;
}

interface Player {
  id: string;
  room_id: string;
  nickname: string;
  session_id: string;
  joined_at: string;
}

const Room = () => {
  const { roomId } = useParams<{ roomId: string }>();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [showTeamDivision, setShowTeamDivision] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(10);

  const sessionId = getSessionId();

  // Navigate function without hook (for error resilience)
  const navigateToHome = () => {
    window.location.href = "/";
  };

  // Join room function
  const joinRoom = useCallback(async (nickname: string) => {
    if (!roomId) return;
    
    setIsJoining(true);

    try {
      const { error } = await supabase.from("players").upsert(
        {
          room_id: roomId,
          nickname,
          session_id: sessionId,
        },
        { onConflict: "room_id,session_id" }
      );

      if (error) throw error;

      setNicknameForRoom(roomId, nickname);
      setHasJoined(true);
      setShowNicknameModal(false);
      toast.success(`Bem-vindo ao lobby, ${nickname}!`);
    } catch (error) {
      console.error("Error joining room:", error);
      toast.error("Erro ao entrar na sala. Tente novamente.");
    } finally {
      setIsJoining(false);
    }
  }, [roomId, sessionId]);

  // Fetch room data
  useEffect(() => {
    async function fetchRoom() {
      if (!roomId) return;

      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (error || !data) {
        toast.error("Sala não encontrada");
        navigateToHome();
        return;
      }

      setRoom(data);
      setIsLoading(false);

      // Check if user already has a nickname for this room
      const existingNickname = getNicknameForRoom(roomId);
      if (existingNickname) {
        // Check if they're still in the room
        const { data: playerData } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", roomId)
          .eq("session_id", sessionId)
          .single();

        if (playerData) {
          setHasJoined(true);
        } else {
          // Re-join with saved nickname
          await joinRoom(existingNickname);
        }
      } else {
        setShowNicknameModal(true);
      }
    }

    fetchRoom();
  }, [roomId, sessionId, joinRoom]);

  // Fetch players and setup realtime subscription
  useEffect(() => {
    if (!roomId) return;

    // Initial fetch
    async function fetchPlayers() {
      const { data } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId)
        .order("joined_at", { ascending: true });

      if (data) setPlayers(data);
    }

    fetchPlayers();

    // Realtime subscription
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPlayers((prev) => [...prev, payload.new as Player]);
          } else if (payload.eventType === "DELETE") {
            setPlayers((prev) =>
              prev.filter((p) => p.id !== (payload.old as Player).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const handleNicknameSubmit = (nickname: string) => {
    joinRoom(nickname);
  };

  // Cleanup player on tab/window close
  useEffect(() => {
    if (!roomId || !hasJoined) return;

    // Aggressive cleanup on beforeunload using synchronous XHR
    const handleBeforeUnload = () => {
      // Get environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Use synchronous XHR (deprecated but works on beforeunload)
      const xhr = new XMLHttpRequest();
      xhr.open("DELETE", `${supabaseUrl}/rest/v1/players?room_id=eq.${roomId}&session_id=eq.${sessionId}`, false);
      xhr.setRequestHeader("apikey", supabaseKey);
      xhr.setRequestHeader("Authorization", `Bearer ${supabaseKey}`);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Prefer", "return=minimal");

      try {
        xhr.send();
      } catch (error) {
        console.warn("Synchronous cleanup failed:", error);
      }
    };

    // Cleanup on component unmount (navigation away)
    const cleanup = async () => {
      try {
        await supabase
          .from("players")
          .delete()
          .eq("room_id", roomId)
          .eq("session_id", sessionId);
      } catch (error) {
        console.warn("Cleanup error:", error);
      }
    };

    // Listen to both beforeunload and visibilitychange
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Also handle page hide (mobile/iOS)
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      cleanup();
    };
  }, [roomId, hasJoined, sessionId]);

  // Populate fake players for testing (admin only)
  const populateFakePlayers = async (count: number) => {
    if (!roomId || !isAdmin) return;

    const fakeNicknames = [
      "Player1", "Player2", "Player3", "Player4", "Player5",
      "Player6", "Player7", "Player8", "Player9", "Player10"
    ];

    try {
      for (let i = 0; i < count; i++) {
        const fakeSessionId = `fake-session-${Date.now()}-${i}-${Math.random()}`;
        await supabase.from("players").insert({
          room_id: roomId,
          nickname: fakeNicknames[i] || `Bot${i + 1}`,
          session_id: fakeSessionId,
        });
      }
      toast.success(`${count} jogadores de teste adicionados!`);
    } catch (error) {
      console.error("Error populating fake players:", error);
      toast.error("Erro ao adicionar jogadores de teste");
    }
  };

  const isAdmin = room?.admin_id === sessionId;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <TacticalBackground />
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando sala...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TacticalBackground />

      {showNicknameModal && (
        <NicknameModal onSubmit={handleNicknameSubmit} isLoading={isJoining} />
      )}

      {room && (
        <>
          <RoomHeader roomId={room.id} />

          <main className="flex-1 container max-w-5xl mx-auto px-4 py-8">
            <div className="space-y-6">
              {/* Lobby Roster */}
              <LobbyRoster
                players={players}
                adminSessionId={room.admin_id}
                currentSessionId={sessionId}
                maxPlayers={maxPlayers}
              />

              {/* Team Division Section - Realtime */}
              {showTeamDivision && (
                <TeamDivisionRealtime
                  players={players}
                  isAdmin={isAdmin}
                  currentSessionId={sessionId}
                  roomId={roomId || ""}
                  onFormatChange={(format) => {
                    const maxMap = { "2v2": 4, "3v3": 6, "4v4": 8, "5v5": 10 };
                    setMaxPlayers(maxMap[format]);
                  }}
                />
              )}

              {/* Admin Actions */}
              {isAdmin && !showTeamDivision && (
                <div className="tactical-card p-6 border border-border">
                  <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wider">
                    Ações do Admin
                  </h3>

                  {/* Test Tools */}
                  <div className="mb-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-xs text-yellow-500 font-semibold uppercase tracking-wider mb-2">
                      🧪 Ferramentas de Teste
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => populateFakePlayers(4)}
                        className="text-xs"
                      >
                        + 4 Jogadores (2v2)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => populateFakePlayers(6)}
                        className="text-xs"
                      >
                        + 6 Jogadores (3v3)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => populateFakePlayers(8)}
                        className="text-xs"
                      >
                        + 8 Jogadores (4v4)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => populateFakePlayers(10)}
                        className="text-xs"
                      >
                        + 10 Jogadores (5v5)
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <Button
                      variant="cs2Primary"
                      size="lg"
                      onClick={() => setShowTeamDivision(true)}
                      className="flex-1"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                      </svg>
                      Configurar Partida
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </main>
        </>
      )}
    </div>
  );
};

export default Room;
