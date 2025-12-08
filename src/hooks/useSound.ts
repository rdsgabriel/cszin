import { useCallback, useRef, useState } from "react";

// Sound effects using Web Audio API with procedural generation
export function useSound() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = "sine", volume: number = 0.15) => {
    if (isMuted) return;

    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (error) {
      console.warn("Error playing sound:", error);
    }
  }, [isMuted, getAudioContext]);

  const playPlayerJoin = useCallback(() => {
    if (isMuted) return;
    // Pleasant "blip" sound
    playTone(800, 0.1, "sine", 0.12);
    setTimeout(() => playTone(1000, 0.08, "sine", 0.1), 50);
  }, [isMuted, playTone]);

  const playTeamShuffle = useCallback(() => {
    if (isMuted) return;
    // Drum roll effect - softer
    const ctx = getAudioContext();
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const noise = ctx.createBufferSource();
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < buffer.length; j++) {
          data[j] = Math.random() * 2 - 1;
        }
        noise.buffer = buffer;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.05;

        noise.connect(gainNode);
        gainNode.connect(ctx.destination);
        noise.start();
      }, i * 60);
    }
    // Final cymbal-like sound - softer
    setTimeout(() => {
      playTone(1800, 0.25, "triangle", 0.08);
    }, 500);
  }, [isMuted, getAudioContext, playTone]);

  const playMapBan = useCallback(() => {
    if (isMuted) return;
    // Subtle descending tone (not aggressive)
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(500, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.15);
  }, [isMuted, getAudioContext]);

  const playMapPick = useCallback(() => {
    if (isMuted) return;
    // Rising confirmation beep
    playTone(400, 0.08, "sine", 0.12);
    setTimeout(() => playTone(500, 0.08, "sine", 0.12), 60);
    setTimeout(() => playTone(600, 0.15, "sine", 0.15), 120);
  }, [isMuted, playTone]);

  const playMatchReady = useCallback(() => {
    if (isMuted) return;
    // Victory fanfare - softer
    const notes = [
      { freq: 523, time: 0, duration: 0.15 },      // C5
      { freq: 659, time: 0.15, duration: 0.15 },   // E5
      { freq: 784, time: 0.3, duration: 0.15 },    // G5
      { freq: 1047, time: 0.45, duration: 0.3 },   // C6
    ];

    notes.forEach(note => {
      setTimeout(() => playTone(note.freq, note.duration, "triangle", 0.18), note.time * 1000);
    });
  }, [isMuted, playTone]);

  const playStepChange = useCallback(() => {
    if (isMuted) return;
    // Subtle step navigation sound
    playTone(600, 0.05, "sine", 0.08);
    setTimeout(() => playTone(700, 0.05, "sine", 0.06), 40);
  }, [isMuted, playTone]);

  const playError = useCallback(() => {
    if (isMuted) return;
    // Gentle error notification
    playTone(300, 0.12, "sine", 0.08);
    setTimeout(() => playTone(250, 0.15, "sine", 0.08), 80);
  }, [isMuted, playTone]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return {
    playPlayerJoin,
    playTeamShuffle,
    playMapBan,
    playMapPick,
    playMatchReady,
    playStepChange,
    playError,
    isMuted,
    toggleMute,
  };
}
