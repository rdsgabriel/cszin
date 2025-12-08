import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";

interface NicknameModalProps {
  onSubmit: (nickname: string) => void;
  isLoading?: boolean;
}

export function NicknameModal({ onSubmit, isLoading }: NicknameModalProps) {
  const [nickname, setNickname] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length >= 2 && trimmed.length <= 20) {
      onSubmit(trimmed);
    }
  };

  const isValid = nickname.trim().length >= 2 && nickname.trim().length <= 20;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="tactical-card p-8 w-full max-w-md mx-4 border border-border hover-glow-gold animate-scale-in">
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        
        <div className="text-center mb-8">
          <Logo size="sm" className="justify-center mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Entre no Lobby
          </h2>
          <p className="text-muted-foreground">
            Digite seu nickname para entrar na sala
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="nickname" className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Nickname
            </label>
            <Input
              id="nickname"
              type="text"
              placeholder="Ex: AcePlayer"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
              className="h-12 text-lg bg-secondary border-border focus:border-primary focus:ring-primary"
              autoFocus
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              2-20 caracteres
            </p>
          </div>

          <Button
            type="submit"
            variant="cs2Primary"
            size="xl"
            className="w-full"
            disabled={!isValid || isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Entrando...
              </span>
            ) : (
              "Entrar no Lobby"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
