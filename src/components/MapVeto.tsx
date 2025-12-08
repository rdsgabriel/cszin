import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type MapStatus = "active" | "banned" | "pickA" | "pickB" | "decider";

interface MapState {
  id: string;
  status: MapStatus;
}

interface Player {
  id: string;
  nickname: string;
  session_id: string;
}

interface MapVetoProps {
  players: Player[];
  isAdmin: boolean;
}

type MatchFormat = "md1" | "md3";

export function MapVeto({ players, isAdmin }: MapVetoProps) {
  const [format, setFormat] = useState<MatchFormat>("md1");
  const [maps, setMaps] = useState<MapState[]>(
    CS2_MAPS.map((m) => ({ id: m.id, status: "active" as MapStatus }))
  );
  const [teamAName, setTeamAName] = useState("Time A");
  const [teamBName, setTeamBName] = useState("Time B");
  const [openPopover, setOpenPopover] = useState<string | null>(null);

  const handleMapAction = (mapId: string, action: MapStatus) => {
    setMaps((prev) => {
      const newMaps = prev.map((m) =>
        m.id === mapId ? { ...m, status: action } : m
      );

      // Check for decider in MD3
      if (format === "md3") {
        const activeMaps = newMaps.filter((m) => m.status === "active");
        const pickAMaps = newMaps.filter((m) => m.status === "pickA");
        const pickBMaps = newMaps.filter((m) => m.status === "pickB");
        const bannedMaps = newMaps.filter((m) => m.status === "banned");

        // If we have 1 pick each and 4 bans, the remaining is the decider
        if (
          activeMaps.length === 1 &&
          pickAMaps.length >= 1 &&
          pickBMaps.length >= 1 &&
          bannedMaps.length >= 4
        ) {
          return newMaps.map((m) =>
            m.status === "active" ? { ...m, status: "decider" } : m
          );
        }
      }

      return newMaps;
    });
    setOpenPopover(null);
  };

  const resetMaps = () => {
    setMaps(CS2_MAPS.map((m) => ({ id: m.id, status: "active" as MapStatus })));
  };

  const getMapInfo = (mapId: string) => {
    return CS2_MAPS.find((m) => m.id === mapId);
  };

  const getStatusStyles = (status: MapStatus) => {
    switch (status) {
      case "banned":
        return "opacity-50 border-destructive/50 bg-destructive/10";
      case "pickA":
        return "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]";
      case "pickB":
        return "border-primary bg-primary/10 shadow-[0_0_15px_hsl(35,95%,55%,0.3)]";
      case "decider":
        return "border-purple-500 bg-purple-500/10 shadow-[0_0_20px_rgba(168,85,247,0.4)] ring-2 ring-purple-500/30";
      default:
        return "border-border hover:border-primary/50";
    }
  };

  const getStatusLabel = (status: MapStatus) => {
    switch (status) {
      case "banned":
        return { text: "BANIDO", color: "text-destructive" };
      case "pickA":
        return { text: `PICK ${teamAName.toUpperCase()}`, color: "text-blue-400" };
      case "pickB":
        return { text: `PICK ${teamBName.toUpperCase()}`, color: "text-primary" };
      case "decider":
        return { text: "DECIDER", color: "text-purple-400" };
      default:
        return null;
    }
  };

  // Calculate result based on format
  const activeMaps = maps.filter((m) => m.status === "active");
  const bannedMaps = maps.filter((m) => m.status === "banned");
  const pickAMaps = maps.filter((m) => m.status === "pickA");
  const pickBMaps = maps.filter((m) => m.status === "pickB");
  const deciderMap = maps.find((m) => m.status === "decider");

  const md1Result = format === "md1" && activeMaps.length === 1 && bannedMaps.length === 6;
  const md3Complete =
    format === "md3" &&
    pickAMaps.length >= 1 &&
    pickBMaps.length >= 1 &&
    deciderMap;

  return (
    <div className="tactical-card p-6 border border-border">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground uppercase tracking-wider">
            Map Veto Phase
          </h2>
          <p className="text-sm text-muted-foreground">
            Clique em um mapa para banir ou escolher
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Format Selector */}
          <Tabs value={format} onValueChange={(v) => { setFormat(v as MatchFormat); resetMaps(); }}>
            <TabsList className="bg-secondary border border-border">
              <TabsTrigger value="md1" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                MD1
              </TabsTrigger>
              <TabsTrigger value="md3" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                MD3
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="cs2Ghost" size="sm" onClick={resetMaps}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset
          </Button>
        </div>
      </div>

      {/* Team Name Editors (for MD3) */}
      {format === "md3" && (
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <input
              type="text"
              value={teamAName}
              onChange={(e) => setTeamAName(e.target.value || "Time A")}
              className="bg-secondary border border-border rounded px-3 py-1.5 text-sm text-foreground focus:border-blue-500 focus:outline-none w-32"
              placeholder="Time A"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <input
              type="text"
              value={teamBName}
              onChange={(e) => setTeamBName(e.target.value || "Time B")}
              className="bg-secondary border border-border rounded px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none w-32"
              placeholder="Time B"
            />
          </div>
        </div>
      )}

      {/* Map Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {maps.map((mapState) => {
          const mapInfo = getMapInfo(mapState.id);
          if (!mapInfo) return null;

          const statusLabel = getStatusLabel(mapState.status);
          const isActive = mapState.status === "active";

          return (
            <Popover
              key={mapState.id}
              open={openPopover === mapState.id}
              onOpenChange={(open) => setOpenPopover(open ? mapState.id : null)}
            >
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-300 min-h-[120px]",
                    getStatusStyles(mapState.status),
                    isActive && isAdmin && "cursor-pointer hover:scale-105",
                    !isActive && "cursor-default"
                  )}
                  disabled={!isAdmin || !isActive}
                >
                  {/* Map Icon */}
                  <span className="text-4xl mb-2">{mapInfo.image}</span>
                  
                  {/* Map Name */}
                  <span className={cn(
                    "font-bold text-sm uppercase tracking-wider",
                    mapState.status === "banned" ? "text-muted-foreground line-through" : "text-foreground"
                  )}>
                    {mapInfo.name}
                  </span>

                  {/* Status Badge */}
                  {statusLabel && (
                    <div className={cn(
                      "absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider",
                      mapState.status === "banned" && "bg-destructive/20",
                      mapState.status === "pickA" && "bg-blue-500/20",
                      mapState.status === "pickB" && "bg-primary/20",
                      mapState.status === "decider" && "bg-purple-500/20"
                    )}>
                      <span className={statusLabel.color}>{statusLabel.text}</span>
                    </div>
                  )}

                  {/* Banned X overlay */}
                  {mapState.status === "banned" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-16 h-16 text-destructive/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}

                  {/* Decider crown */}
                  {mapState.status === "decider" && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <span className="text-2xl">👑</span>
                    </div>
                  )}
                </button>
              </PopoverTrigger>

              {isActive && isAdmin && (
                <PopoverContent className="w-48 p-2 bg-card border-border" align="center">
                  <div className="space-y-1">
                    <button
                      onClick={() => handleMapAction(mapState.id, "banned")}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-destructive/20 text-destructive transition-colors text-sm font-medium"
                    >
                      <span className="text-lg">🔴</span>
                      Banir
                    </button>
                    
                    {format === "md3" && (
                      <>
                        <button
                          onClick={() => handleMapAction(mapState.id, "pickA")}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-500/20 text-blue-400 transition-colors text-sm font-medium"
                        >
                          <span className="text-lg">🔵</span>
                          Pick {teamAName}
                        </button>
                        <button
                          onClick={() => handleMapAction(mapState.id, "pickB")}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-primary/20 text-primary transition-colors text-sm font-medium"
                        >
                          <span className="text-lg">🟡</span>
                          Pick {teamBName}
                        </button>
                      </>
                    )}
                  </div>
                </PopoverContent>
              )}
            </Popover>
          );
        })}
      </div>

      {/* Result Summary */}
      {(md1Result || md3Complete) && (
        <div className="border-t border-border pt-6">
          <h3 className="text-lg font-bold text-foreground mb-4 uppercase tracking-wider">
            Resultado do Veto
          </h3>
          
          {md1Result && (
            <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/10 border border-primary/30">
              <span className="text-4xl">{getMapInfo(activeMaps[0].id)?.image}</span>
              <div>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Mapa Selecionado</p>
                <p className="text-2xl font-bold text-primary">{getMapInfo(activeMaps[0].id)?.name}</p>
              </div>
            </div>
          )}

          {md3Complete && (
            <div className="space-y-3">
              {/* Match 1 */}
              {pickAMaps[0] && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <span className="text-sm font-bold text-blue-400 w-16">MAPA 1</span>
                  <span className="text-2xl">{getMapInfo(pickAMaps[0].id)?.image}</span>
                  <span className="font-bold text-foreground">{getMapInfo(pickAMaps[0].id)?.name}</span>
                  <span className="text-xs text-blue-400 ml-auto">Pick {teamAName}</span>
                </div>
              )}
              
              {/* Match 2 */}
              {pickBMaps[0] && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/10 border border-primary/30">
                  <span className="text-sm font-bold text-primary w-16">MAPA 2</span>
                  <span className="text-2xl">{getMapInfo(pickBMaps[0].id)?.image}</span>
                  <span className="font-bold text-foreground">{getMapInfo(pickBMaps[0].id)?.name}</span>
                  <span className="text-xs text-primary ml-auto">Pick {teamBName}</span>
                </div>
              )}
              
              {/* Decider */}
              {deciderMap && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                  <span className="text-sm font-bold text-purple-400 w-16">MAPA 3</span>
                  <span className="text-2xl">{getMapInfo(deciderMap.id)?.image}</span>
                  <span className="font-bold text-foreground">{getMapInfo(deciderMap.id)?.name}</span>
                  <span className="text-xs text-purple-400 ml-auto flex items-center gap-1">
                    <span>👑</span> Decider
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 rounded-lg bg-secondary/50 border border-border">
        <h4 className="font-semibold text-foreground mb-2">
          {format === "md1" ? "Como funciona (MD1):" : "Como funciona (MD3):"}
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          {format === "md1" ? (
            <>
              <li>• Clique em um mapa para banir</li>
              <li>• Continue banindo até restar apenas 1 mapa</li>
              <li>• O mapa restante será o mapa da partida</li>
            </>
          ) : (
            <>
              <li>• Cada time bane 2 mapas (total 4 bans)</li>
              <li>• Cada time escolhe 1 mapa (picks)</li>
              <li>• O mapa restante é o DECIDER (mapa 3, se necessário)</li>
              <li>• Ordem sugerida: Ban A, Ban B, Ban B, Ban A, Pick A, Pick B</li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
