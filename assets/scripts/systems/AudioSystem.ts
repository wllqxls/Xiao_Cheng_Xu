import type { AudioClip, AudioSource } from 'cc';
import type { GameSettings } from '../types/GameTypes';

export type AudioCue =
  | 'tap'
  | 'restore'
  | 'upgrade'
  | 'event'
  | 'risk'
  | 'victory'
  | 'failure';

export type AudioCueMap = Partial<Record<AudioCue, AudioClip | null>>;

export function syncAmbienceAudio(
  source: AudioSource | null,
  clip: AudioClip | null,
  settings: GameSettings,
): void {
  if (!source) {
    return;
  }

  source.volume = clampAudioVolume(settings.musicVolume);
  source.loop = true;
  source.clip = clip;

  if (!clip || source.volume <= 0) {
    source.stop();
    return;
  }

  if (!source.playing) {
    source.play();
  }
}

export function playAudioCue(
  source: AudioSource | null,
  cue: AudioCue,
  clips: AudioCueMap,
  settings: GameSettings,
): void {
  const clip = clips[cue];

  if (!source || !clip) {
    return;
  }

  source.volume = clampAudioVolume(settings.sfxVolume);

  if (source.volume <= 0) {
    return;
  }

  source.playOneShot(clip);
}

export function clampAudioVolume(volume: number): number {
  if (Number.isNaN(volume)) {
    return 0;
  }

  return Math.max(0, Math.min(1, volume));
}
