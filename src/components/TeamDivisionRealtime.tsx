import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useSound } from "@/hooks/useSound";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// CS2 Competitive Map Pool
const CS2_MAPS = [
  { id: "mirage", name: "Mirage", image: "🏜️" },
  { id: "inferno", name: "Inferno", image: "🔥" },
  { id: "nuke", name: "Nuke", image: "☢️" },
  { id: "overpass", name: "Overpass", image: "🌉" },
  { id: "ancient", name: "Ancient", image: "🏛️" },
  { id: "anubis", name: "Anubis", image: "🐍" },
  { id: "vertigo", name: "Vertigo", image: "🏗️" },
];

type TeamFormat = "2v2" | "3v3" | "4v4" | "5v5";
type MatchFormat = "md1" | "md3" | "md5";
type MapStatus = "active" | "banned" | "picked";
type Step = "config" | "teams" | "ban" | "result";

interface Player {
  id: string;
  nickname: string;
  session_id: string;
}

interface TeamDivisionRealtimeProps {
  players: Player[];
  isAdmin: boolean;
  currentSessionId: string;
  roomId: string;
  onFormatChange?: (format: TeamFormat) => void;
}

interface TeamPlayer {
  id: string;
  nickname: string;
  session_id: string;
}

interface MapState {
  id: string;
  status: MapStatus;
  pickedBy?: "teamA" | "teamB";
}

interface BanHistoryEntry {
  team: string;
  mapName: string;
  action: "ban" | "pick";
}

interface MatchState {
  id?: string;
  room_id: string;
  team_format: TeamFormat;
  match_format: MatchFormat;
  current_step: Step;
  team_a_name: string;
  team_a_players: TeamPlayer[];
  team_a_captain_id: string | null;
  team_b_name: string;
  team_b_players: TeamPlayer[];
  team_b_captain_id: string | null;
  maps: MapState[];
  current_turn: "teamA" | "teamB";
  ban_history: BanHistoryEntry[];
}

export function TeamDivisionRealtime({
  players,
  isAdmin,
  currentSessionId,
  roomId,
  onFormatChange,
}: TeamDivisionRealtimeProps) {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tableError, setTableError] = useState<boolean>(false);

  const {
    playTeamShuffle,
    playMapBan,
    playMapPick,
    playMatchReady,
    playStepChange,
    isMuted,
    toggleMute,
  } = useSound();

  const requiredPlayers = {
    "2v2": 4,
    "3v3": 6,
    "4v4": 8,
    "5v5": 10,
  };

  // Get match configuration based on format
  const getMatchConfig = (format: MatchFormat) => {
    switch (format) {
      case "md1":
        return {
          totalBans: 6,
          totalPicks: 0,
          totalMaps: 1,
          order: ["ban", "ban", "ban", "ban", "ban", "ban"] as ("ban" | "pick")[],
        };
      case "md3":
        return {
          totalBans: 4,
          totalPicks: 2,
          totalMaps: 3,
          order: ["ban", "ban", "ban", "ban", "pick", "pick"] as ("ban" | "pick")[],
        };
      case "md5":
        return {
          totalBans: 2,
          totalPicks: 4,
          totalMaps: 5,
          order: ["pick", "pick", "ban", "ban", "pick", "pick"] as ("ban" | "pick")[],
        };
    }
  };

  const matchConfig = matchState ? getMatchConfig(matchState.match_format) : getMatchConfig("md1");

  // Initialize or fetch match state
  useEffect(() => {
    const initMatchState = async () => {
      try {
        // Try to fetch existing match state
        const { data: existing, error: fetchError } = await supabase
          .from("match_state")
          .select("*")
          .eq("room_id", roomId)
          .single();

        if (fetchError && fetchError.code !== "PGRST116") {
          console.error("Error fetching match state:", fetchError);
          console.error("Error code:", fetchError.code);
          console.error("Error message:", fetchError.message);

          // Check if it's a "table does not exist" error
          if (
            fetchError.code === "42P01" ||
            fetchError.code === "PGRST204" ||
            fetchError.message?.includes("does not exist") ||
            (fetchError.message?.includes("relation") && fetchError.message?.includes("match_state")) ||
            fetchError.details?.includes("match_state")
          ) {
            console.error("❌ Tabela match_state não existe!");
            setTableError(true);
            setIsLoading(false);
            toast.error("Tabela match_state não encontrada. Configure o banco de dados.");
            return;
          }
        }

        if (existing) {
          setMatchState(existing as any);
        } else {
          // Create initial match state
          const initialState: MatchState = {
            room_id: roomId,
            team_format: "5v5",
            match_format: "md1",
            current_step: "config",
            team_a_name: "Time A",
            team_a_players: [],
            team_a_captain_id: null,
            team_b_name: "Time B",
            team_b_players: [],
            team_b_captain_id: null,
            maps: CS2_MAPS.map((m) => ({ id: m.id, status: "active" as MapStatus })),
            current_turn: "teamA",
            ban_history: [],
          };

          const { data: created, error: createError } = await supabase
            .from("match_state")
            .insert([initialState])
            .select()
            .single();

          if (createError) {
            console.error("Error creating match state:", createError);
            console.error("Error code:", createError.code);
            console.error("Error message:", createError.message);
            console.error("Error details:", createError.details);

            // Check if error is due to missing table
            if (
              createError.code === "42P01" ||
              createError.code === "PGRST204" ||
              createError.message?.includes("does not exist") ||
              createError.message?.includes("relation") ||
              createError.details?.includes("match_state")
            ) {
              console.error("❌ Tabela match_state não existe - redirecionando para setup");
              setTableError(true);
              setIsLoading(false);
              toast.error("Tabela match_state não encontrada. Configure o banco de dados primeiro.");
              return;
            }

            toast.error("Erro ao criar estado da partida");
          } else {
            setMatchState(created as any);
          }
        }
      } catch (error) {
        console.error("Error initializing match state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initMatchState();
  }, [roomId]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`match-state-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_state",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "UPDATE" || payload.eventType === "INSERT") {
            const newState = payload.new as any;
            setMatchState(newState);

            // Play sounds based on step changes
            if (payload.old && (payload.old as any).current_step !== newState.current_step) {
              if (newState.current_step === "result") {
                playMatchReady();
                confetti({
                  particleCount: 100,
                  spread: 70,
                  origin: { y: 0.6 },
                });
              } else {
                playStepChange();
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, playMatchReady, playStepChange]);

  // Update match state in Supabase
  const updateMatchState = useCallback(
    async (updates: Partial<MatchState>) => {
      if (!matchState?.id) return;

      const { error } = await supabase
        .from("match_state")
        .update(updates)
        .eq("room_id", roomId);

      if (error) {
        console.error("Error updating match state:", error);
        toast.error("Erro ao atualizar estado da partida");
      }
    },
    [matchState, roomId]
  );

  // Shuffle array helper
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Create teams
  const handleCreateTeams = async () => {
    if (!matchState) return;

    const currentRequired = requiredPlayers[matchState.team_format];
    if (players.length !== currentRequired) {
      toast.error(`Necessário ${currentRequired} jogadores!`);
      return;
    }

    playTeamShuffle();

    const shuffledPlayers = shuffleArray(players);
    const playersPerTeam = currentRequired / 2;

    const teamAPlayers = shuffledPlayers.slice(0, playersPerTeam);
    const teamBPlayers = shuffledPlayers.slice(playersPerTeam);

    const teamACaptain = teamAPlayers[Math.floor(Math.random() * teamAPlayers.length)];
    const teamBCaptain = teamBPlayers[Math.floor(Math.random() * teamBPlayers.length)];

    await updateMatchState({
      team_a_players: teamAPlayers,
      team_a_captain_id: teamACaptain.session_id,
      team_b_players: teamBPlayers,
      team_b_captain_id: teamBCaptain.session_id,
      current_step: "teams",
    });
  };

  // Start ban phase
  const handleStartBanPhase = async () => {
    playStepChange();
    await updateMatchState({
      current_step: "ban",
      maps: CS2_MAPS.map((m) => ({ id: m.id, status: "active" as MapStatus })),
      ban_history: [],
      current_turn: "teamA",
    });
  };

  // Handle map action
  const handleMapAction = async (mapId: string, action: "ban" | "pick") => {
    if (!matchState) return;

    const mapInfo = CS2_MAPS.find((m) => m.id === mapId);
    if (!mapInfo) return;

    if (action === "ban") {
      playMapBan();
    } else {
      playMapPick();
    }

    const teamName =
      matchState.current_turn === "teamA" ? matchState.team_a_name : matchState.team_b_name;

    const newMaps = matchState.maps.map((m) =>
      m.id === mapId
        ? {
            ...m,
            status: (action === "ban" ? "banned" : "picked") as MapStatus,
            pickedBy: action === "pick" ? matchState.current_turn : undefined,
          }
        : m
    );

    const newBanHistory = [
      ...matchState.ban_history,
      { team: teamName, mapName: mapInfo.name, action },
    ];

    const newBannedCount = newMaps.filter((m) => m.status === "banned").length;
    const newPickedCount = newMaps.filter((m) => m.status === "picked").length;
    const newTotalActions = newBannedCount + newPickedCount;

    const newTurn = matchState.current_turn === "teamA" ? "teamB" : "teamA";

    if (newTotalActions >= matchConfig.order.length) {
      // Final action - mark remaining maps as picked and go to result
      const activeCount = newMaps.filter((m) => m.status === "active").length;
      const finalMaps =
        activeCount > 0
          ? newMaps.map((m) => (m.status === "active" ? { ...m, status: "picked" as MapStatus } : m))
          : newMaps;

      setTimeout(() => {
        updateMatchState({
          maps: finalMaps,
          ban_history: newBanHistory,
          current_step: "result",
        });
      }, 300);
    } else {
      await updateMatchState({
        maps: newMaps,
        ban_history: newBanHistory,
        current_turn: newTurn,
      });
    }

    setOpenPopover(null);
  };

  // Show setup instructions if table doesn't exist
  if (tableError) {
    return (
      <div className="tactical-card p-6 border border-destructive bg-destructive/5">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-2xl font-bold text-destructive mb-2">
            Banco de Dados Não Configurado
          </h3>
          <p className="text-muted-foreground mb-6">
            A tabela <code className="bg-background px-2 py-1 rounded">match_state</code> ainda não foi criada no Supabase.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-background border border-border">
            <h4 className="font-bold text-foreground mb-2">🛠️ Como Resolver:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Siga as instruções no arquivo <code className="bg-secondary px-2 py-1 rounded text-xs">SETUP_NOVO_PROJETO.md</code></li>
              <li>Execute os SQLs no Supabase Dashboard</li>
              <li>Volte aqui e recarregue a página</li>
            </ol>
          </div>

          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
            <p className="text-sm text-yellow-400 mb-2">
              💡 <strong>Dica:</strong> Se você ainda não criou as tabelas, consulte o arquivo
              <code className="bg-background/50 px-2 py-1 rounded mx-1">SETUP_NOVO_PROJETO.md</code>
              na raiz do projeto para um guia passo-a-passo completo.
            </p>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => window.location.reload()}
          >
            🔄 Recarregar Página
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !matchState) {
    return (
      <div className="tactical-card p-6 border border-border">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando configuração...</p>
        </div>
      </div>
    );
  }

  const currentRequired = requiredPlayers[matchState.team_format];
  const hasEnoughPlayers = players.length === currentRequired;

  // Check permissions
  const isTeamACaptain = matchState.team_a_captain_id === currentSessionId;
  const isTeamBCaptain = matchState.team_b_captain_id === currentSessionId;
  const isAnyCaptain = isTeamACaptain || isTeamBCaptain;
  const isCurrentTurnCaptain =
    (matchState.current_turn === "teamA" && isTeamACaptain) ||
    (matchState.current_turn === "teamB" && isTeamBCaptain);

  const canInteractWithMaps = isCurrentTurnCaptain || isAdmin;

  // Get current action
  const totalActions =
    matchState.maps.filter((m) => m.status === "banned").length +
    matchState.maps.filter((m) => m.status === "picked").length;

  const currentAction =
    totalActions < matchConfig.order.length ? matchConfig.order[totalActions] : null;

  const canBan = currentAction === "ban";
  const canPick = currentAction === "pick";

  // Get final maps
  const getFinalMaps = () => {
    if (matchState.match_format === "md1") {
      const remaining = matchState.maps.find((m) => m.status === "active");
      return remaining ? [remaining] : [];
    } else {
      const picked = matchState.maps.filter((m) => m.status === "picked");
      const remaining = matchState.maps.filter((m) => m.status === "active");
      return [
        ...picked,
        ...remaining.slice(0, matchConfig.totalMaps - picked.length),
      ];
    }
  };

  const finalMaps = getFinalMaps();

  const getMapInfo = (mapId: string) => {
    return CS2_MAPS.find((m) => m.id === mapId);
  };

  const getStatusStyles = (status: MapStatus) => {
    switch (status) {
      case "banned":
        return "opacity-50 border-destructive/50 bg-destructive/10";
      case "picked":
        return "border-primary bg-primary/10 shadow-[0_0_15px_hsl(35,95%,55%,0.3)]";
      default:
        return "border-border hover:border-primary/50";
    }
  };

  const steps: { id: Step; label: string; icon: string }[] = [
    { id: "config", label: "Configuração", icon: "⚙️" },
    { id: "teams", label: "Times", icon: "👥" },
    { id: "ban", label: "Ban de Mapas", icon: "🗺️" },
    { id: "result", label: "Resultado", icon: "🏆" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === matchState.current_step);

  const goBack = () => {
    playStepChange();
    if (matchState.current_step === "teams") {
      updateMatchState({ current_step: "config" });
    } else if (matchState.current_step === "ban") {
      updateMatchState({ current_step: "teams" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="tactical-card p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground uppercase tracking-wider">
            Configuração da Partida
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMute}
              className="text-muted-foreground hover:text-foreground"
            >
              {isMuted ? "🔇" : "🔊"}
            </Button>
            {isAnyCaptain && (
              <div className="px-3 py-1 rounded-lg bg-primary/20 border border-primary">
                <span className="text-xs font-bold text-primary uppercase">
                  👑 Você é Capitão
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div
                className={cn(
                  "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all flex-1",
                  index <= currentStepIndex
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-secondary/50 text-muted-foreground"
                )}
              >
                <span className="text-xl">{step.icon}</span>
                <span className="font-semibold text-sm hidden sm:inline">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-4 mx-1 transition-colors",
                    index < currentStepIndex ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Configuration */}
      {matchState.current_step === "config" && (
        <div className="tactical-card p-6 border border-border animate-slide-up">
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wider mb-6">
            Escolha o Formato
          </h3>

          <div className="space-y-6">
            {/* Team Format */}
            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Formato do Time
              </label>
              <Tabs
                value={matchState.team_format}
                onValueChange={(v) => {
                  const format = v as TeamFormat;
                  updateMatchState({ team_format: format });
                  if (onFormatChange) {
                    onFormatChange(format);
                  }
                }}
                disabled={!isAdmin}
              >
                <TabsList className="bg-secondary border border-border w-full grid grid-cols-4">
                  <TabsTrigger
                    value="2v2"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    2v2 (4)
                  </TabsTrigger>
                  <TabsTrigger
                    value="3v3"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    3v3 (6)
                  </TabsTrigger>
                  <TabsTrigger
                    value="4v4"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    4v4 (8)
                  </TabsTrigger>
                  <TabsTrigger
                    value="5v5"
                    className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    5v5 (10)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Match Format */}
            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Formato da Partida
              </label>
              <Tabs
                value={matchState.match_format}
                onValueChange={(v) => updateMatchState({ match_format: v as MatchFormat })}
                disabled={!isAdmin}
              >
                <TabsList className="bg-secondary border border-border w-full">
                  <TabsTrigger
                    value="md1"
                    className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    MD1 (Melhor de 1)
                  </TabsTrigger>
                  <TabsTrigger
                    value="md3"
                    className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    MD3 (Melhor de 3)
                  </TabsTrigger>
                  <TabsTrigger
                    value="md5"
                    className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    MD5 (Melhor de 5)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Player Count Status */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
              <div>
                <p className="text-sm text-muted-foreground">Jogadores necessários</p>
                <p className="text-2xl font-bold text-foreground">
                  {players.length} / {currentRequired}
                </p>
              </div>
              {hasEnoughPlayers ? (
                <div className="flex items-center gap-2 text-green-500">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-semibold">Pronto!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-500">
                  <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="font-semibold">Aguardando...</span>
                </div>
              )}
            </div>

            {/* Next Button */}
            {isAdmin && (
              <Button
                variant="cs2Primary"
                size="lg"
                className="w-full"
                disabled={!hasEnoughPlayers}
                onClick={handleCreateTeams}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                Sortear Times
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Teams */}
      {matchState.current_step === "teams" && (
        <div className="tactical-card p-6 border border-border animate-slide-up space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground uppercase tracking-wider">
              Times Sorteados
            </h3>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={goBack}>
                ← Voltar
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team A */}
            <div className="p-4 rounded-lg bg-blue-500/10 border-2 border-blue-500/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold text-blue-400 uppercase tracking-wider">
                  {matchState.team_a_name}
                </h4>
                <div className="px-2 py-1 rounded bg-blue-500/20 border border-blue-500/50">
                  <span className="text-xs font-bold text-blue-400">
                    {matchState.team_a_players.length}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {matchState.team_a_players.map((player) => {
                  const isCaptain = player.session_id === matchState.team_a_captain_id;
                  const isYou = player.session_id === currentSessionId;
                  return (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded border",
                        isCaptain
                          ? "bg-yellow-500/10 border-yellow-500/50"
                          : "bg-secondary/50 border-border"
                      )}
                    >
                      {isCaptain && <span className="text-lg">👑</span>}
                      <span
                        className={cn(
                          "font-medium text-sm flex-1",
                          isYou ? "text-primary" : "text-foreground"
                        )}
                      >
                        {player.nickname} {isYou && "(você)"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team B */}
            <div className="p-4 rounded-lg bg-orange-500/10 border-2 border-orange-500/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold text-orange-400 uppercase tracking-wider">
                  {matchState.team_b_name}
                </h4>
                <div className="px-2 py-1 rounded bg-orange-500/20 border border-orange-500/50">
                  <span className="text-xs font-bold text-orange-400">
                    {matchState.team_b_players.length}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {matchState.team_b_players.map((player) => {
                  const isCaptain = player.session_id === matchState.team_b_captain_id;
                  const isYou = player.session_id === currentSessionId;
                  return (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded border",
                        isCaptain
                          ? "bg-yellow-500/10 border-yellow-500/50"
                          : "bg-secondary/50 border-border"
                      )}
                    >
                      {isCaptain && <span className="text-lg">👑</span>}
                      <span
                        className={cn(
                          "font-medium text-sm flex-1",
                          isYou ? "text-primary" : "text-foreground"
                        )}
                      >
                        {player.nickname} {isYou && "(você)"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Next Button */}
          {isAdmin && (
            <Button
              variant="cs2Primary"
              size="lg"
              className="w-full"
              onClick={handleStartBanPhase}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              Iniciar Ban de Mapas
            </Button>
          )}
        </div>
      )}

      {/* Step 3: Ban Phase */}
      {matchState.current_step === "ban" && (
        <div className="tactical-card p-6 border border-border animate-slide-up space-y-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-foreground uppercase tracking-wider">
              Ban de Mapas
            </h3>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={goBack}>
                ← Voltar
              </Button>
            )}
          </div>

          {/* Current Turn Info */}
          <div
            className={cn(
              "p-4 rounded-lg border-2",
              matchState.current_turn === "teamA"
                ? "bg-blue-500/10 border-blue-500/50"
                : "bg-orange-500/10 border-orange-500/50"
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Turno Atual
                </p>
                <p
                  className={cn(
                    "text-lg font-bold uppercase",
                    matchState.current_turn === "teamA" ? "text-blue-400" : "text-orange-400"
                  )}
                >
                  {matchState.current_turn === "teamA"
                    ? matchState.team_a_name
                    : matchState.team_b_name}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Capitão:{" "}
                  {matchState.current_turn === "teamA"
                    ? matchState.team_a_players.find(
                        (p) => p.session_id === matchState.team_a_captain_id
                      )?.nickname
                    : matchState.team_b_players.find(
                        (p) => p.session_id === matchState.team_b_captain_id
                      )?.nickname}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ação</p>
                <p className="text-2xl font-bold text-foreground">
                  {totalActions + 1}/{matchConfig.order.length}
                </p>
                <p className="text-sm font-semibold text-primary uppercase mt-1">
                  {currentAction === "ban" ? "🚫 Ban" : "✅ Pick"}
                </p>
              </div>
            </div>

            {/* Permission feedback */}
            {!canInteractWithMaps && (
              <div className="mt-3 p-2 rounded bg-secondary/50 border border-border">
                <p className="text-xs text-muted-foreground text-center">
                  👀 Aguardando o capitão fazer a escolha...
                </p>
              </div>
            )}
            {canInteractWithMaps && isCurrentTurnCaptain && (
              <div className="mt-3 p-2 rounded bg-primary/20 border border-primary">
                <p className="text-xs text-primary text-center font-semibold">
                  👑 É sua vez! {currentAction === "ban" ? "Escolha um mapa para BANIR" : "Escolha um mapa para JOGAR"}
                </p>
              </div>
            )}
          </div>

          {/* Map Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {matchState.maps.map((map) => {
              const mapInfo = getMapInfo(map.id);
              if (!mapInfo) return null;

              const isActive = map.status === "active";
              const isBanned = map.status === "banned";
              const isPicked = map.status === "picked";

              return (
                <div key={map.id} className="relative">
                  {canInteractWithMaps && isActive ? (
                    <Popover
                      open={openPopover === map.id}
                      onOpenChange={(open) => setOpenPopover(open ? map.id : null)}
                    >
                      <PopoverTrigger asChild>
                        <button
                          className={cn(
                            "w-full p-4 rounded-lg border-2 transition-all",
                            "hover:scale-105 active:scale-95",
                            getStatusStyles(map.status)
                          )}
                        >
                          <div className="text-4xl mb-2">{mapInfo.image}</div>
                          <p className="font-semibold text-sm text-foreground">{mapInfo.name}</p>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-48 p-2">
                        <div className="space-y-1">
                          {canBan && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => handleMapAction(map.id, "ban")}
                            >
                              🚫 Banir {mapInfo.name}
                            </Button>
                          )}
                          {canPick && (
                            <Button
                              variant="default"
                              size="sm"
                              className="w-full justify-start bg-green-600 hover:bg-green-700"
                              onClick={() => handleMapAction(map.id, "pick")}
                            >
                              ✅ Escolher {mapInfo.name}
                            </Button>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div
                      className={cn(
                        "w-full p-4 rounded-lg border-2 transition-all",
                        getStatusStyles(map.status),
                        !isActive && "cursor-not-allowed"
                      )}
                    >
                      <div className="text-4xl mb-2">{mapInfo.image}</div>
                      <p className="font-semibold text-sm text-foreground">{mapInfo.name}</p>
                      {isBanned && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl opacity-50">🚫</span>
                        </div>
                      )}
                      {isPicked && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-6xl opacity-50">✅</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ban History */}
          {matchState.ban_history.length > 0 && (
            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                Histórico
              </h4>
              <div className="space-y-2">
                {matchState.ban_history.map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm p-2 rounded bg-background/50"
                  >
                    <span className="font-mono text-muted-foreground">#{idx + 1}</span>
                    <span className="font-semibold text-foreground">{entry.team}</span>
                    <span className="text-muted-foreground">
                      {entry.action === "ban" ? "baniu" : "escolheu"}
                    </span>
                    <span className="font-semibold text-primary">{entry.mapName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Result */}
      {matchState.current_step === "result" && (
        <div className="tactical-card p-6 border border-border animate-slide-up space-y-6">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-foreground uppercase tracking-wider mb-2">
              Partida Configurada!
            </h3>
            <p className="text-muted-foreground">
              Os times e mapas foram definidos. Boa sorte!
            </p>
          </div>

          {/* Teams Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Team A */}
            <div className="p-4 rounded-lg bg-blue-500/10 border-2 border-blue-500/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold text-blue-400 uppercase tracking-wider">
                  {matchState.team_a_name}
                </h4>
              </div>
              <div className="space-y-2">
                {matchState.team_a_players.map((player) => {
                  const isCaptain = player.session_id === matchState.team_a_captain_id;
                  const isYou = player.session_id === currentSessionId;
                  return (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded border",
                        isCaptain
                          ? "bg-yellow-500/10 border-yellow-500/50"
                          : "bg-secondary/50 border-border"
                      )}
                    >
                      {isCaptain && <span className="text-lg">👑</span>}
                      <span
                        className={cn(
                          "font-medium text-sm flex-1",
                          isYou ? "text-primary" : "text-foreground"
                        )}
                      >
                        {player.nickname} {isYou && "(você)"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team B */}
            <div className="p-4 rounded-lg bg-orange-500/10 border-2 border-orange-500/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-base font-bold text-orange-400 uppercase tracking-wider">
                  {matchState.team_b_name}
                </h4>
              </div>
              <div className="space-y-2">
                {matchState.team_b_players.map((player) => {
                  const isCaptain = player.session_id === matchState.team_b_captain_id;
                  const isYou = player.session_id === currentSessionId;
                  return (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded border",
                        isCaptain
                          ? "bg-yellow-500/10 border-yellow-500/50"
                          : "bg-secondary/50 border-border"
                      )}
                    >
                      {isCaptain && <span className="text-lg">👑</span>}
                      <span
                        className={cn(
                          "font-medium text-sm flex-1",
                          isYou ? "text-primary" : "text-foreground"
                        )}
                      >
                        {player.nickname} {isYou && "(você)"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Final Maps */}
          <div className="p-6 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary">
            <h4 className="text-base font-bold text-primary uppercase tracking-wider mb-4 text-center">
              Mapas da Partida
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {finalMaps.map((map) => {
                const mapInfo = getMapInfo(map.id);
                if (!mapInfo) return null;
                return (
                  <div
                    key={map.id}
                    className="p-4 rounded-lg bg-background border-2 border-primary text-center"
                  >
                    <div className="text-4xl mb-2">{mapInfo.image}</div>
                    <p className="font-semibold text-sm text-foreground">{mapInfo.name}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ban History */}
          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Histórico Completo
            </h4>
            <div className="space-y-2">
              {matchState.ban_history.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm p-2 rounded bg-background/50"
                >
                  <span className="font-mono text-muted-foreground">#{idx + 1}</span>
                  <span className="font-semibold text-foreground">{entry.team}</span>
                  <span className="text-muted-foreground">
                    {entry.action === "ban" ? "baniu" : "escolheu"}
                  </span>
                  <span className="font-semibold text-primary">{entry.mapName}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reset Button */}
          {isAdmin && (
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() =>
                updateMatchState({
                  current_step: "config",
                  team_a_players: [],
                  team_a_captain_id: null,
                  team_b_players: [],
                  team_b_captain_id: null,
                  maps: CS2_MAPS.map((m) => ({ id: m.id, status: "active" as MapStatus })),
                  ban_history: [],
                  current_turn: "teamA",
                })
              }
            >
              🔄 Nova Configuração
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
