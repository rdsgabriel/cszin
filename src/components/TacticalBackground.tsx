export function TacticalBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-cs2-slate/30 to-background" />
      
      {/* Hexagonal pattern overlay */}
      <div className="absolute inset-0 bg-tactical-hex opacity-50" />
      
      {/* Radial glow from center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px]" />
      
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      {/* Scan line effect */}
      <div className="absolute inset-0 scan-line pointer-events-none" />
    </div>
  );
}
