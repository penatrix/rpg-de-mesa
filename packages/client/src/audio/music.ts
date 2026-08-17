/**
 * Trilha sonora sintetizada no navegador.
 *
 * Nenhum arquivo de áudio, nenhuma licença, nenhum download: cada faixa é uma
 * escala, uma progressão de acordes e um timbre, definidos pela ambientação e
 * tocados com Web Audio.
 *
 * O que faz isso soar medieval e não como um sintetizador dos anos 80 são
 * quatro coisas, nesta ordem de importância:
 *
 *   1. **Bordão** — uma quinta aberta segurada embaixo de tudo, o som da gaita
 *      de foles e da sanfona de roda. É o que datava a música antes de existir
 *      harmonia funcional.
 *   2. **Corda dedilhada** — ataque instantâneo e decaimento curto, com duas
 *      ondas levemente desafinadas entre si. É o que separa alaúde de órgão.
 *   3. **Reverberação de sala** — uma resposta ao impulso gerada aqui mesmo,
 *      para que o som aconteça em algum lugar em vez de dentro da caixa.
 *   4. **Melodia modal** — uma linha por cima do acorde, tirada da própria
 *      escala da faixa, com ornamento ocasional.
 */

import type { TrackDef } from '@rpg/shared';

let context: AudioContext | null = null;
let master: GainNode | null = null;
let reverbBus: GainNode | null = null;
let stopCurrent: (() => void) | null = null;
let currentTrackId: string | null = null;

/**
 * Resposta ao impulso gerada por ruído decrescente.
 *
 * Uma sala de pedra é ruído que morre devagar; é literalmente isso que a curva
 * exponencial abaixo descreve. Custa alguns milissegundos na primeira nota e
 * nenhum byte de download.
 */
function buildImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const samples = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

function ensureContext(): AudioContext {
  if (!context) {
    context = new AudioContext();

    master = context.createGain();
    master.gain.value = 0.35;
    master.connect(context.destination);

    const convolver = context.createConvolver();
    convolver.buffer = buildImpulse(context, 2.6, 2.4);

    reverbBus = context.createGain();
    reverbBus.gain.value = 0.34;
    reverbBus.connect(convolver);
    convolver.connect(master);
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

interface Voice {
  ctx: AudioContext;
  dry: AudioNode;
  wet: AudioNode;
}

/**
 * Corda dedilhada: alaúde, harpa, cítara.
 *
 * Duas ondas afastadas por poucos cents batem entre si e produzem o coro
 * natural de uma corda dupla — o mesmo truque de um alaúde encordoado aos
 * pares. O filtro que fecha junto com o envelope é o abafamento da corda.
 */
function pluck(voice: Voice, frequency: number, at: number, duration: number, peak: number): void {
  const { ctx } = voice;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(7000, frequency * 7), at);
  filter.frequency.exponentialRampToValueAtTime(Math.max(240, frequency * 1.6), at + duration);
  filter.Q.value = 0.9;

  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  for (const detune of [-6, 6]) {
    const oscillator = ctx.createOscillator();
    oscillator.type = 'triangle';
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    oscillator.connect(filter);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.05);
  }

  filter.connect(gain);
  gain.connect(voice.dry);
  gain.connect(voice.wet);
}

/** Nota sustentada: o pad do acorde e o bordão. */
function sustain(
  voice: Voice,
  frequency: number,
  at: number,
  duration: number,
  peak: number,
  waveform: OscillatorType,
): void {
  const { ctx } = voice;
  const gain = ctx.createGain();
  const attack = Math.min(0.4, duration * 0.25);

  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.setValueAtTime(peak, at + duration * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);

  const oscillator = ctx.createOscillator();
  oscillator.type = waveform;
  oscillator.frequency.value = frequency;
  oscillator.connect(gain);
  oscillator.start(at);
  oscillator.stop(at + duration + 0.1);

  gain.connect(voice.dry);
  gain.connect(voice.wet);
}

/** Tambor de moldura: ruído curto por um passa-banda grave. */
function drum(voice: Voice, at: number, peak: number): void {
  const { ctx } = voice;
  const length = Math.floor(ctx.sampleRate * 0.18);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 110;
  filter.Q.value = 1.4;

  const gain = ctx.createGain();
  gain.gain.value = peak;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(voice.dry);
  gain.connect(voice.wet);
  source.start(at);
}

/**
 * Gerador determinístico por faixa.
 *
 * A melodia precisa variar de compasso a compasso, mas a mesma faixa deve soar
 * como a mesma faixa toda vez que tocar. `Math.random` daria variação sem
 * identidade.
 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return ((state >>> 0) % 10000) / 10000;
  };
}

function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function playTrack(track: TrackDef): void {
  if (currentTrackId === track.id) return;
  stopMusic();

  const ctx = ensureContext();
  void ctx.resume();

  // Barramento próprio da faixa: silenciar tudo é baixar um ganho só, o que
  // evita o clique de cortar oscilador no meio do ciclo.
  const dry = ctx.createGain();
  dry.gain.value = 1;

  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = track.synth.waveform === 'sawtooth' ? 1900 : 3200;
  tone.Q.value = 0.6;
  dry.connect(tone);
  tone.connect(master!);

  const wet = ctx.createGain();
  wet.gain.value = 1;
  wet.connect(reverbBus!);

  const voice: Voice = { ctx, dry, wet };

  const beat = 60 / track.synth.tempo;
  const barDuration = beat * 4;
  const progression = track.synth.progression;
  const level = track.synth.padLevel;
  const percussive = track.mood === 'combate' || track.mood === 'triunfo';
  const random = seededRandom(hashString(track.id));

  let bar = 0;
  let cancelled = false;
  let timer = 0;

  const scheduleBar = (): void => {
    if (cancelled) return;

    const chord = progression[bar % progression.length]!;
    const root = chord[0]!;
    const startAt = ctx.currentTime + 0.06;

    // 1. Bordão: tônica e quinta duas oitavas abaixo, atravessando o compasso.
    //    Só a tônica da progressão muda; a quinta segue junto, como na corda
    //    livre de uma sanfona de roda.
    sustain(voice, noteFrequency(track, root, -2), startAt, barDuration, level * 0.85, 'sawtooth');
    sustain(voice, noteFrequency(track, root + 4, -2), startAt, barDuration, level * 0.5, 'sine');

    // 2. Acorde sustentado, uma oitava abaixo do registro central.
    for (const degree of chord) {
      sustain(
        voice,
        noteFrequency(track, degree, -1),
        startAt,
        barDuration * 0.94,
        level * 0.55,
        track.synth.waveform,
      );
    }

    // 3. Alaúde: o acorde dedilhado nota a nota, com uma corda extra na segunda
    //    metade do compasso para o compasso não soar quadrado.
    if (track.synth.arpeggio) {
      for (let step = 0; step < 4; step++) {
        const degree = chord[step % chord.length]! + (step === 3 ? 7 : 0);
        pluck(voice, noteFrequency(track, degree), startAt + step * beat, beat * 0.9, level * 1.5);
        if (step % 2 === 1 && random() > 0.45) {
          pluck(
            voice,
            noteFrequency(track, degree + 2),
            startAt + step * beat + beat * 0.5,
            beat * 0.5,
            level * 0.9,
          );
        }
      }
    }

    // 4. Melodia: uma nota longa por compasso, tirada do acorde, com um
    //    ornamento de passagem antes dela em parte dos compassos. Simples de
    //    propósito — trilha de fundo que chama atenção atrapalha a mesa.
    const melodyDegree = chord[Math.floor(random() * chord.length)]! + 7;
    if (random() > 0.3) {
      pluck(
        voice,
        noteFrequency(track, melodyDegree - 1),
        startAt + beat * 1.5,
        beat * 0.4,
        level * 0.8,
      );
    }
    pluck(voice, noteFrequency(track, melodyDegree), startAt + beat * 2, beat * 1.6, level * 1.2);

    // 5. Tambor de moldura, só onde faz sentido.
    if (percussive) {
      drum(voice, startAt, level * 3);
      drum(voice, startAt + beat * 2, level * 2.2);
      drum(voice, startAt + beat * 3.5, level * 1.4);
    }

    bar++;
    timer = window.setTimeout(scheduleBar, barDuration * 1000);
  };

  timer = window.setTimeout(scheduleBar, 0);

  currentTrackId = track.id;
  stopCurrent = () => {
    cancelled = true;
    window.clearTimeout(timer);

    // Corte seco produz clique; o fade também deixa a última nota terminar.
    const now = ctx.currentTime;
    for (const node of [dry.gain, wet.gain]) {
      node.cancelScheduledValues(now);
      node.setValueAtTime(node.value, now);
      node.linearRampToValueAtTime(0.0001, now + 0.5);
    }
    window.setTimeout(() => {
      dry.disconnect();
      wet.disconnect();
      tone.disconnect();
    }, 800);
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
