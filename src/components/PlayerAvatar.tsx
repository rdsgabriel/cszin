import { cn } from "@/lib/utils";

interface PlayerAvatarProps {
  nickname: string;
  isAdmin?: boolean;
  className?: string;
}

// Tactical avatar icons as SVG paths
const avatarPatterns = [
  "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", // Diamond
  "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", // Shield
  "M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z", // Star
  "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", // Hexagon
];

function getAvatarPattern(nickname: string): string {
  const index = nickname.charCodeAt(0) % avatarPatterns.length;
  return avatarPatterns[index];
}

function getAvatarColor(nickname: string): string {
  const colors = [
    "text-primary",
    "text-cs2-teal",
    "text-amber-500",
    "text-emerald-500",
  ];
  const index = (nickname.charCodeAt(0) + nickname.length) % colors.length;
  return colors[index];
}

export function PlayerAvatar({ nickname, isAdmin, className }: PlayerAvatarProps) {
  const pattern = getAvatarPattern(nickname);
  const color = isAdmin ? "text-primary" : getAvatarColor(nickname);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center w-10 h-10 rounded-lg bg-secondary border border-border",
        isAdmin && "border-primary/50 glow-gold",
        className
      )}
    >
      <svg
        className={cn("w-5 h-5", color)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
      >
        <path d={pattern} />
      </svg>
      {isAdmin && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary flex items-center justify-center">
          <svg className="w-2 h-2 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        </div>
      )}
    </div>
  );
}
