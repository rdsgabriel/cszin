import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ className, size = "md" }: LogoProps) {
  const sizes = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-5xl md:text-6xl",
  };

  return (
    <div className={cn("font-display font-bold tracking-tight", sizes[size], className)}>
      <span className="text-foreground">CS2</span>
      <span className="text-gradient-gold ml-2">Scrim Master</span>
    </div>
  );
}
