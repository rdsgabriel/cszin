import { useState, useEffect } from "react";
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

type TeamFormat = "3v3" | "4v4" | "5v5";
type MatchFormat = "md1" | "md3" | "md5";
type MapStatus = "active" | "banned" | "picked";
type Step = "config" | "teams" | "ban" | "result";

interface Player {
  id: string;
  nickname: string;
  session_id: string;
}

interface TeamDivisionProps {
  players: Player[];
  isAdmin: boolean;
  currentSessionId: string;
  onFormatChange?: (format: TeamFormat) => void;
}

interface Team {
  name: string;
  players: Player[];
  captain: Player | null;
}

interface MapState {
  id: string;
  status: MapStatus;
  pickedBy?: "teamA" | "teamB";
}

export function TeamDivision({ players, isAdmin, currentSessionId, onFormatChange }: TeamDivisionProps) {
  const [currentStep, setCurrentStep] = useState<Step>("config");
  const [teamFormat, setTeamFormat] = useState<TeamFormat>("5v5");
  const [matchFormat, setMatchFormat] = useState<MatchFormat>("md1");
  const [teamA, setTeamA] = useState<Team>({ name: "Time A", players: [], captain: null });
  const [teamB, setTeamB] = useState<Team>({ name: "Time B", players: [], captain: null });
  const [maps, setMaps] = useState<MapState[]>(
    CS2_MAPS.map((m) => ({ id: m.id, status: "active" as MapStatus }))
  );
  const [currentBanTurn, setCurrentBanTurn] = useState<"teamA" | "teamB">("teamA");
  const [banHistory, setBanHistory] = useState<Array<{ team: string; mapName: string; action: "ban" | "pick" }>>([]);
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const {
    playPlayerJoin,
    playTeamShuffle,
    playMapBan,
    playMapPick,
    playMatchReady,
    playStepChange,
    isMuted,
    toggleMute,
  } = useSound();

  const requiredPlayers = {
    "3v3": 6,
    "4v4": 8,
    "5v5": 10,
  };

  const currentRequired = requiredPlayers[teamFormat];
  const hasEnoughPlayers = players.length === currentRequired;

  // Handle format change
  const handleTeamFormatChange = (format: TeamFormat) => {
    setTeamFormat(format);
    if (onFormatChange) {
      onFormatChange(format);
    }
  };

  // Get number of bans and picks based on match format
  const getMatchConfig = () => {
    switch (matchFormat) {
      case "md1":
        return {
          totalBans: 6,
          totalPicks: 0,
          totalMaps: 1,
          order: ["ban", "ban", "ban", "ban", "ban", "ban"] // 6 bans, 1 remains
        };
      case "md3":
        return {
          totalBans: 4,
          totalPicks: 2,
          totalMaps: 3,
          order: ["ban", "ban", "ban", "ban", "pick", "pick"] // 4 bans, 2 picks, 1 decider remains
        };
      case "md5":
        return {
          totalBans: 2,
          totalPicks: 4,
          totalMaps: 5,
          order: ["pick", "pick", "ban", "ban", "pick", "pick"] // 2 picks, 2 bans, 2 picks, 1 decider remains
        };
    }
  };

  const matchConfig = getMatchConfig();

  // Shuffle array helper
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Create teams and select captains
  const handleCreateTeams = () => {
    if (!hasEnoughPlayers) return;

    playTeamShuffle();

    const shuffledPlayers = shuffleArray(players);
    const playersPerTeam = currentRequired / 2;

    const teamAPlayers = shuffledPlayers.slice(0, playersPerTeam);
    const teamBPlayers = shuffledPlayers.slice(playersPerTeam);

    const teamACaptain = teamAPlayers[Math.floor(Math.random() * teamAPlayers.length)];
    const teamBCaptain = teamBPlayers[Math.floor(Math.random() * teamBPlayers.length)];

    setTeamA({
      name: "Time A",
      players: teamAPlayers,
      captain: teamACaptain,
    });

    setTeamB({
      name: "Time B",
      players: teamBPlayers,
      captain: teamBCaptain,
    });

    setTimeout(() => {
      setCurrentStep("teams");
      playStepChange();
    }, 600);
  };

  // Start ban phase
  const handleStartBanPhase = () => {
    playStepChange();
    setCurrentStep("ban");
    setMaps(CS2_MAPS.map((m) => ({ id: m.id, status: "active" as MapStatus })));
    setBanHistory([]);
    setCurrentBanTurn("teamA");
  };

  // Handle map action (ban or pick)
  const handleMapAction = (mapId: string, action: "ban" | "pick") => {
    const mapInfo = CS2_MAPS.find(m => m.id === mapId);
    if (!mapInfo) return;

    if (action === "ban") {
      playMapBan();
    } else {
      playMapPick();
    }

    const teamName = currentBanTurn === "teamA" ? teamA.name : teamB.name;

    // Update maps
    const newMaps = maps.map((m) =>
      m.id === mapId
        ? {
            ...m,
            status: action === "ban" ? "banned" : "picked",
            pickedBy: action === "pick" ? currentBanTurn : undefined
          }
        : m
    );

    setMaps(newMaps);
    setBanHistory(prev => [...prev, { team: teamName, mapName: mapInfo.name, action }]);
    setOpenPopover(null);

    // Switch turn
    setCurrentBanTurn(current => current === "teamA" ? "teamB" : "teamA");

    // Check if this was the last action
    const newBannedCount = newMaps.filter(m => m.status === "banned").length;
    const newPickedCount = newMaps.filter(m => m.status === "picked").length;
    const newTotalActions = newBannedCount + newPickedCount;

    if (newTotalActions >= matchConfig.order.length) {
      // This was the last action - finalize immediately
      setTimeout(() => {
        // Mark remaining active maps as picked
        const activeCount = newMaps.filter(m => m.status === "active").length;
        if (activeCount > 0) {
          setMaps(prev => prev.map(m =>
            m.status === "active" ? { ...m, status: "picked" as MapStatus } : m
          ));
        }

        // Finalize after a brief moment
        setTimeout(() => {
          playMatchReady();
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
          setTimeout(() => {
            setCurrentStep("result");
          }, 500);
        }, 300);
      }, 100);
    }
  };

  // No longer needed - handled inline in handleMapAction

  // Get final maps
  const getFinalMaps = () => {
    if (matchFormat === "md1") {
      const remaining = maps.find(m => m.status === "active");
      return remaining ? [remaining] : [];
    } else {
      const picked = maps.filter(m => m.status === "picked");
      const remaining = maps.filter(m => m.status === "active");
      return [...picked, ...remaining.slice(0, matchConfig.totalPicks - picked.length)];
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

  const activeMaps = maps.filter(m => m.status === "active");
  const bannedMaps = maps.filter(m => m.status === "banned");
  const pickedMaps = maps.filter(m => m.status === "picked");

  // Determine current action based on order
  const totalActions = bannedMaps.length + pickedMaps.length;
  const currentAction = totalActions < matchConfig.order.length
    ? matchConfig.order[totalActions]
    : null;

  const canBan = currentAction === "ban";
  const canPick = currentAction === "pick";

  // Check if current user is the captain whose turn it is
  const currentCaptain = currentBanTurn === "teamA" ? teamA.captain : teamB.captain;
  const isCurrentUserCaptain = currentCaptain?.session_id === currentSessionId;
  const canCurrentUserInteract = isCurrentUserCaptain || isAdmin;

  const steps: { id: Step; label: string; icon: string }[] = [
    { id: "config", label: "Configuração", icon: "⚙️" },
    { id: "teams", label: "Times", icon: "👥" },
    { id: "ban", label: "Ban de Mapas", icon: "🗺️" },
    { id: "result", label: "Resultado", icon: "🏆" },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const goBack = () => {
    playStepChange();
    if (currentStep === "teams") setCurrentStep("config");
    else if (currentStep === "ban") setCurrentStep("teams");
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="tactical-card p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground uppercase tracking-wider">
            Configuração da Partida
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            className="text-muted-foreground hover:text-foreground"
          >
            {isMuted ? "🔇" : "🔊"}
          </Button>
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
                <div className={cn(
                  "h-0.5 w-4 mx-1 transition-colors",
                  index < currentStepIndex ? "bg-primary" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Configuration */}
      {currentStep === "config" && (
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
              <Tabs value={teamFormat} onValueChange={(v) => handleTeamFormatChange(v as TeamFormat)}>
                <TabsList className="bg-secondary border border-border w-full">
                  <TabsTrigger value="3v3" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    3v3 (6 jogadores)
                  </TabsTrigger>
                  <TabsTrigger value="4v4" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    4v4 (8 jogadores)
                  </TabsTrigger>
                  <TabsTrigger value="5v5" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    5v5 (10 jogadores)
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Match Format */}
            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Formato da Partida
              </label>
              <Tabs value={matchFormat} onValueChange={(v) => setMatchFormat(v as MatchFormat)}>
                <TabsList className="bg-secondary border border-border w-full">
                  <TabsTrigger value="md1" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    MD1 (Melhor de 1)
                  </TabsTrigger>
                  <TabsTrigger value="md3" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                    MD3 (Melhor de 3)
                  </TabsTrigger>
                  <TabsTrigger value="md5" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
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
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">Pronto!</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-yellow-500">
                  <svg className="w-6 h-6 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Sortear Times
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Teams Display */}
      {currentStep === "teams" && (
        <div className="tactical-card p-6 border border-border animate-slide-up">
          <h3 className="text-lg font-bold text-foreground uppercase tracking-wider mb-6">
            Times Formados
          </h3>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Team A */}
            <div className="p-4 rounded-lg border-2 border-blue-500/30 bg-blue-500/5 animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 rounded-full bg-blue-500" />
                <input
                  type="text"
                  value={teamA.name}
                  onChange={(e) => setTeamA(prev => ({ ...prev, name: e.target.value || "Time A" }))}
                  className="bg-secondary border border-border rounded px-3 py-1.5 text-lg font-bold text-foreground focus:border-blue-500 focus:outline-none flex-1"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                {teamA.players.map((player, index) => (
                  <div
                    key={player.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded bg-secondary/50 animate-slide-up",
                      player.id === teamA.captain?.id && "ring-2 ring-blue-500"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <span className="text-foreground font-medium">{player.nickname}</span>
                    {player.id === teamA.captain?.id && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded bg-blue-500 text-white font-bold flex items-center gap-1">
                        <span>👑</span> CAPITÃO
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Team B */}
            <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5 animate-slide-up" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 rounded-full bg-primary" />
                <input
                  type="text"
                  value={teamB.name}
                  onChange={(e) => setTeamB(prev => ({ ...prev, name: e.target.value || "Time B" }))}
                  className="bg-secondary border border-border rounded px-3 py-1.5 text-lg font-bold text-foreground focus:border-primary focus:outline-none flex-1"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-2">
                {teamB.players.map((player, index) => (
                  <div
                    key={player.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded bg-secondary/50 animate-slide-up",
                      player.id === teamB.captain?.id && "ring-2 ring-primary"
                    )}
                    style={{ animationDelay: `${index * 50 + 100}ms` }}
                  >
                    <span className="text-foreground font-medium">{player.nickname}</span>
                    {player.id === teamB.captain?.id && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground font-bold flex items-center gap-1">
                        <span>👑</span> CAPITÃO
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          {isAdmin && (
            <div className="flex gap-4">
              <Button variant="cs2Ghost" size="lg" onClick={goBack}>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                Voltar
              </Button>
              <Button variant="cs2Primary" size="lg" className="flex-1" onClick={handleStartBanPhase}>
                Iniciar Ban de Mapas
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Ban Phase */}
      {currentStep === "ban" && (
        <div className="space-y-6">
          {/* Current Turn Banner */}
          <div className={cn(
            "tactical-card p-6 border-2",
            currentBanTurn === "teamA" ? "border-blue-500 bg-blue-500/10" : "border-primary bg-primary/10",
            isCurrentUserCaptain && "animate-pulse ring-4 ring-primary/30"
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-4xl">🎯</div>
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider">Turno Atual</p>
                  <p className="text-2xl font-bold text-foreground">
                    {currentBanTurn === "teamA" ? teamA.name : teamB.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Capitão: <span className="text-foreground font-semibold">
                      {currentBanTurn === "teamA" ? teamA.captain?.nickname : teamB.captain?.nickname}
                    </span>
                    {isCurrentUserCaptain && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-primary text-primary-foreground font-bold animate-pulse">
                        É SUA VEZ!
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground uppercase tracking-wider">
                  Ação {totalActions + 1}/{matchConfig.order.length}
                </p>
                <p className="text-xl font-bold text-primary">
                  {canBan && "🔴 Banir Mapa"}
                  {canPick && "⭐ Escolher Mapa"}
                  {!canBan && !canPick && "✅ Aguardando..."}
                </p>
              </div>
            </div>

            {!isCurrentUserCaptain && !isAdmin && (
              <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-sm text-yellow-500 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Aguardando o capitão {currentCaptain?.nickname} fazer sua escolha...
                </p>
              </div>
            )}
          </div>

          {/* Map Grid */}
          <div className="tactical-card p-6 border border-border">
            <h3 className="text-lg font-bold text-foreground uppercase tracking-wider mb-4">
              Pool de Mapas
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {maps.map((mapState, index) => {
                const mapInfo = getMapInfo(mapState.id);
                if (!mapInfo) return null;

                const isActive = mapState.status === "active";
                const canInteract = canCurrentUserInteract && isActive;

                return (
                  <Popover
                    key={mapState.id}
                    open={openPopover === mapState.id}
                    onOpenChange={(open) => setOpenPopover(open ? mapState.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <button
                        className={cn(
                          "relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-300 min-h-[120px] animate-slide-up",
                          getStatusStyles(mapState.status),
                          canInteract && "cursor-pointer hover:scale-105",
                          !canInteract && "cursor-default"
                        )}
                        style={{ animationDelay: `${index * 50}ms` }}
                        disabled={!canInteract}
                      >
                        <span className="text-4xl mb-2">{mapInfo.image}</span>
                        <span className={cn(
                          "font-bold text-sm uppercase tracking-wider",
                          mapState.status === "banned" ? "text-muted-foreground line-through" : "text-foreground"
                        )}>
                          {mapInfo.name}
                        </span>

                        {mapState.status === "banned" && (
                          <>
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-destructive/20">
                              <span className="text-destructive">BANIDO</span>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg className="w-16 h-16 text-destructive/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </div>
                          </>
                        )}

                        {mapState.status === "picked" && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-primary/20">
                            <span className="text-primary">PICK</span>
                          </div>
                        )}
                      </button>
                    </PopoverTrigger>

                    {canInteract && (
                      <PopoverContent className="w-48 p-2 bg-card border-border" align="center">
                        <div className="space-y-1">
                          {canBan && (
                            <button
                              onClick={() => handleMapAction(mapState.id, "ban")}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-destructive/20 text-destructive transition-colors text-sm font-medium"
                            >
                              <span className="text-lg">🔴</span>
                              Banir Mapa
                            </button>
                          )}

                          {canPick && (
                            <button
                              onClick={() => handleMapAction(mapState.id, "pick")}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-primary/20 text-primary transition-colors text-sm font-medium"
                            >
                              <span className="text-lg">⭐</span>
                              Escolher Mapa
                            </button>
                          )}
                        </div>
                      </PopoverContent>
                    )}
                  </Popover>
                );
              })}
            </div>
          </div>

          {/* Action Order Progress */}
          <div className="tactical-card p-6 border border-border">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Sequência de Ações
            </h3>
            <div className="flex flex-wrap gap-2">
              {matchConfig.order.map((action, index) => {
                const isDone = index < totalActions;
                const isCurrent = index === totalActions;

                return (
                  <div
                    key={index}
                    className={cn(
                      "px-3 py-2 rounded-lg border-2 transition-all font-semibold text-sm",
                      isDone && "bg-green-500/20 border-green-500 text-green-400",
                      isCurrent && "bg-primary/20 border-primary text-primary animate-pulse ring-2 ring-primary/30",
                      !isDone && !isCurrent && "bg-secondary/50 border-border text-muted-foreground"
                    )}
                  >
                    <span className="mr-1">{index + 1}.</span>
                    {action === "ban" ? "🔴 Ban" : "⭐ Pick"}
                    {isDone && " ✓"}
                  </div>
                );
              })}
              <div className={cn(
                "px-3 py-2 rounded-lg border-2 font-semibold text-sm",
                totalActions >= matchConfig.order.length
                  ? "bg-purple-500/20 border-purple-500 text-purple-400"
                  : "bg-secondary/50 border-border text-muted-foreground"
              )}>
                <span className="mr-1">{matchConfig.order.length + 1}.</span>
                👑 Decider
                {totalActions >= matchConfig.order.length && " ✓"}
              </div>
            </div>
          </div>

          {/* Ban History */}
          {banHistory.length > 0 && (
            <div className="tactical-card p-6 border border-border">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Histórico de Ações
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {banHistory.map((entry, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm p-2 rounded bg-secondary/30 animate-slide-up">
                    <span className="text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium text-foreground">{entry.team}</span>
                    <span className={cn(
                      "font-bold",
                      entry.action === "ban" ? "text-destructive" : "text-primary"
                    )}>
                      {entry.action === "ban" ? "baniu" : "escolheu"}
                    </span>
                    <span className="font-semibold text-foreground">{entry.mapName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Back Button */}
          {isAdmin && (
            <Button variant="cs2Ghost" size="lg" onClick={goBack}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
              </svg>
              Voltar
            </Button>
          )}
        </div>
      )}

      {/* Step 4: Final Result */}
      {currentStep === "result" && (
        <div className="tactical-card p-6 border border-border animate-slide-up">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-foreground uppercase tracking-wider mb-2">
              Configuração Completa!
            </h3>
            <p className="text-muted-foreground">A partida está pronta para começar</p>
          </div>

          {/* Teams Summary */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="font-bold text-foreground text-lg">{teamA.name}</span>
              </div>
              <div className="space-y-1">
                {teamA.players.map(player => (
                  <div key={player.id} className="text-sm text-muted-foreground">
                    • {player.nickname}
                    {player.id === teamA.captain?.id && " 👑"}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="font-bold text-foreground text-lg">{teamB.name}</span>
              </div>
              <div className="space-y-1">
                {teamB.players.map(player => (
                  <div key={player.id} className="text-sm text-muted-foreground">
                    • {player.nickname}
                    {player.id === teamB.captain?.id && " 👑"}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Maps Summary */}
          <div className="space-y-3 mb-6">
            <h4 className="font-semibold text-foreground uppercase tracking-wider text-sm">
              Mapas da Partida
            </h4>
            {finalMaps.map((mapState, index) => {
              const mapInfo = getMapInfo(mapState.id);
              if (!mapInfo) return null;

              return (
                <div
                  key={mapState.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-primary/10 border border-primary/30 animate-slide-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <span className="text-sm font-bold text-primary w-16">
                    MAPA {index + 1}
                  </span>
                  <span className="text-2xl">{mapInfo.image}</span>
                  <span className="font-bold text-foreground">{mapInfo.name}</span>
                  {matchFormat === "md1" && (
                    <span className="text-xs text-muted-foreground ml-auto">
                      Último restante
                    </span>
                  )}
                  {mapState.status === "picked" && (
                    <span className="text-xs text-primary ml-auto">
                      Pick {mapState.pickedBy === "teamA" ? teamA.name : teamB.name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Buttons */}
          {isAdmin && (
            <div className="flex gap-4">
              <Button
                variant="cs2Ghost"
                size="lg"
                onClick={() => {
                  setCurrentStep("config");
                  playStepChange();
                }}
              >
                🔄 Reiniciar Configuração
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
