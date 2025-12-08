import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { copyToClipboard } from "@/lib/roomUtils";
import { toast } from "sonner";

interface RoomHeaderProps {
  roomId: string;
}

export function RoomHeader({ roomId }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = window.location.href;
    const success = await copyToClipboard(url);
    
    if (success) {
      setCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error("Falha ao copiar o link");
    }
  };

  return (
    <header className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 md:p-6 border-b border-border bg-card/50 backdrop-blur-sm">
      <Logo size="sm" />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-secondary px-4 py-2 rounded-lg border border-border">
          <span className="text-sm text-muted-foreground uppercase tracking-wider">
            Código:
          </span>
          <span className="font-mono font-bold text-lg text-primary tracking-widest">
            {roomId}
          </span>
        </div>

        <Button
          variant="cs2Secondary"
          onClick={handleCopyLink}
          className="gap-2"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copiado!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar Link
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
