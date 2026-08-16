/**
 * Trilha sonora sintetizada no navegador.
 *
 * Nenhum arquivo de áudio, nenhuma licença, nenhum download: cada faixa é uma
 * escala, uma progressão de acordes e um timbre, definidos pela ambientação e
 * tocados com Web Audio. Isso é o que torna "uma trilha por mundo" viável sem
 * empacotar dezenas de megabytes de MP3.
 */

import type { TrackDef } from '@rpg/shared';

let context: AudioContext | null = null;
let master: GainNode | null = null;
let stopCurrent: (() => void) | null = null;
let currentTrackId: string | null = null;

function ensureContext(): AudioContext {
  if (!context) {
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.35;
    master.connect(context.destination);
  }
  return context;
}

/** Frequência de um grau da escala, em uma dada oitava. */
function noteFrequency(track: TrackDef, degree: number, octave = 0): number {
  const { scale, root } = track.synth;
  const index = ((degree % scale.length) + scale.length) % scale.length;
  const octaveShift = Math.floor(degree / scale.length) + octave;
  const semitones = scale[index]! + 12 * octaveShift;
  return root * Math.pow(2, semitones / 12);
}

/** Uma nota com envelope ADSR simples. */
function playNote(
  ctx: AudioContext,
  destination: AudioNode,
  frequency: number,
  startAt: number,
  duration: number,
  waveform: OscillatorType,
  peak: number,
): void {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = waveform;
  oscillator.frequency.value = frequency;

  const attack = Math.min(0.08, duration * 0.2);
  const release = Math.min(0.5, duration * 0.6);

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(peak, startAt + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration + release);

  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + release + 0.05);
}

export function playTrack(track: TrackDef): void {
  if (currentTrackId === track.id) return;
  stopMusic();

  const ctx = ensureContext();
  void ctx.resume();

  const output = master!;
  // Um filtro passa-baixa tira o brilho agressivo das ondas serra/quadrada e
  // deixa o resultado soar como trilha de fundo, não como sintetizador cru.
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = track.synth.waveform === 'sawtooth' ? 1400 : 2600;
  filter.Q.value = 0.7;
  filter.connect(output);

  const reverb = ctx.createGain();
  reverb.gain.value = 0.5;
  reverb.connect(filter);

  const beat = 60 / track.synth.tempo;
  const barDuration = beat * 4;
  const progression = track.synth.progression;

  let bar = 0;
  let cancelled = false;

  const scheduleBar = (): void => {
    if (cancelled) return;

    const chord = progression[bar % progression.length]!;
    const startAt = ctx.currentTime + 0.05;

    // Pad: o acorde inteiro sustentado por um compasso, uma oitava abaixo.
    for (const degree of chord) {
      playNote(
        ctx,
        reverb,
        noteFrequency(track, degree, -1),
        startAt,
        barDuration * 0.95,
        track.synth.waveform,
        track.synth.padLevel,
      );
    }

    // Arpejo: as notas do acorde em sequência, uma por tempo.
    if (track.synth.arpeggio) {
      for (let step = 0; step < 4; step++) {
        const degree = chord[step % chord.length]!;
        playNote(
          ctx,
          filter,
          noteFrequency(track, degree, step === 3 ? 1 : 0),
          startAt + step * beat,
          beat * 0.6,
          'triangle',
          track.synth.padLevel * 0.55,
        );
      }
    }

    bar++;
    timer = window.setTimeout(scheduleBar, barDuration * 1000);
  };

  let timer = window.setTimeout(scheduleBar, 0);

  currentTrackId = track.id;
  stopCurrent = () => {
    cancelled = true;
    window.clearTimeout(timer);
    // Fade curto: cortar seco produz um clique audível.
    const now = ctx.currentTime;
    reverb.gain.cancelScheduledValues(now);
    reverb.gain.setValueAtTime(reverb.gain.value, now);
    reverb.gain.linearRampToValueAtTime(0.0001, now + 0.4);
    window.setTimeout(() => {
      reverb.disconnect();
      filter.disconnect();
    }, 600);
  };
}

export function stopMusic(): void {
  stopCurrent?.();
  stopCurrent = null;
  currentTrackId = null;
}

export function setVolume(value: number): void {
  ensureContext();
  if (master) master.gain.value = Math.max(0, Math.min(1, value));
}

export function currentTrack(): string | null {
  return currentTrackId;
}

/**
 * Navegadores exigem um gesto do usuário antes de tocar áudio. Chame isto num
 * clique para destravar o contexto.
 */
export function unlockAudio(): void {
  void ensureContext().resume();
}
