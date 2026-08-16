/**
 * Trilha sonora sintetizada no navegador.
 *
 * Nenhum arquivo de áudio, nenhuma licença, nenhum download: cada faixa é uma
 * escala, uma progressão de acordes e um timbre, definidos pela ambientação e
 * tocados com Web Audio. Isso é o que torna "uma trilha por mundo" viável sem
 * empacotar dezenas de megabytes de MP3.
 */
import type { TrackDef } from '@rpg/shared';
export declare function playTrack(track: TrackDef): void;
export declare function stopMusic(): void;
export declare function setVolume(value: number): void;
export declare function currentTrack(): string | null;
/**
 * Navegadores exigem um gesto do usuário antes de tocar áudio. Chame isto num
 * clique para destravar o contexto.
 */
export declare function unlockAudio(): void;
//# sourceMappingURL=music.d.ts.map