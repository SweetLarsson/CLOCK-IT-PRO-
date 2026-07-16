/**
 * Web Audio API based Sound Synthesizer for Worker Check-Ins
 * Provides distinct audio notification tones without static file asset requirements.
 */

export function playCheckInSound(soundName: string | undefined) {
  if (!soundName || soundName === "none") return;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const audioCtx = new AudioContextClass();
    
    // Resume context if suspended (browser security autoplay policies)
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }

    if (soundName === "beep") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // C# / A pitched standard beep
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } 
    else if (soundName === "chime") {
      // Harmonic high-quality arpeggio (C major 7th chord)
      const tones = [523.25, 659.25, 783.99, 987.77]; // C5, E5, G5, B5
      
      tones.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.06);
        
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.06 + 0.3);
        
        osc.start(audioCtx.currentTime + idx * 0.06);
        osc.stop(audioCtx.currentTime + idx * 0.06 + 0.3);
      });
    } 
    else if (soundName === "digital") {
      // Double sharp futuristic digital chime
      const triggerBeep = (startTime: number, freq: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startTime);
        
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + 0.06);
        
        osc.start(audioCtx.currentTime + startTime);
        osc.stop(audioCtx.currentTime + startTime + 0.06);
      };
      
      triggerBeep(0, 1100);
      triggerBeep(0.07, 1320);
    } 
    else if (soundName === "ping") {
      // Gentle soft warm acoustic ping
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    }
  } catch (err) {
    console.warn("Failed to play synthesized notification sound:", err);
  }
}
