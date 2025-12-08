import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { TacticalBackground } from "@/components/TacticalBackground";
import { generateRoomId, getSessionId } from "@/lib/roomUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Index = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async () => {
    setIsCreating(true);

    try {
      const roomId = generateRoomId();
      const sessionId = getSessionId();

      // Create room in database
      const { error } = await supabase.from("rooms").insert({
        id: roomId,
        admin_id: sessionId,
      });

      if (error) throw error;

      // Navigate to room
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error("Error creating room:", error);
      toast.error("Erro ao criar sala. Tente novamente.");
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TacticalBackground />

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center max-w-3xl mx-auto animate-fade-in">
          {/* Logo/Title */}
          <div className="mb-6">
            <Logo size="lg" className="justify-center" />
          </div>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Organize seus <span className="text-primary font-semibold">5v5</span>, defina times e faça o map veto{" "}
            <span className="text-foreground font-semibold">sem caos</span>.
          </p>

          {/* CTA Button */}
          <Button
            variant="cs2Primary"
            size="xl"
            onClick={handleCreateRoom}
            disabled={isCreating}
            className="animate-pulse-glow text-lg px-12"
          >
            {isCreating ? (
              <span className="flex items-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Criando Sala...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Criar Nova Sala
              </>
            )}
          </Button>

          {/* Feature hints */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {[
              {
                icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
                title: "Lobby em Tempo Real",
                desc: "Veja quem entrou na sala instantaneamente",
              },
              {
                icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
                title: "Organize Times",
                desc: "Divida os jogadores de forma justa e balanceada",
              },
              {
                icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
                title: "Map Veto",
                desc: "Sistema de veto para escolher o mapa perfeito",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="tactical-card p-5 border border-border hover-glow-gold group"
                style={{ animationDelay: `${i * 100 + 200}ms` }}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-sm text-muted-foreground">
          Feito para jogadores. Nenhum login necessário.
        </p>
      </footer>
    </div>
  );
};

export default Index;
