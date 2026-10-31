import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

type AudioModule = typeof import('expo-audio');
type Player = ReturnType<AudioModule['createAudioPlayer']>;

const PREVIEW_MS = 15_000;

function audio(): AudioModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-audio') as AudioModule;
  } catch {
    return null;
  }
}

/** Plays the alarm tone for the Settings preview. Stops on unmount, on backgrounding and after a few seconds. */
export function useAlarmPreview(volume: number) {
  const [playing, setPlaying] = useState(false);
  const player = useRef<Player | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    try {
      player.current?.pause();
      player.current?.remove();
    } catch {
      /* the player may already be gone */
    }
    player.current = null;
    setPlaying(false);
  }, []);

  const play = useCallback(async () => {
    stop();
    const A = audio();
    if (!A) return;
    try {
      await A.setAudioModeAsync({ playsInSilentMode: true });
      const p = A.createAudioPlayer(require('../../assets/sounds/alarm.wav'));
      p.loop = true;
      p.volume = volume;
      p.play();
      player.current = p;
      setPlaying(true);
      timer.current = setTimeout(stop, PREVIEW_MS);
    } catch {
      stop();
    }
  }, [stop, volume]);

  useEffect(() => {
    if (player.current) player.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') stop();
    });
    return () => {
      sub.remove();
      stop();
    };
  }, [stop]);

  return { playing, play, stop };
}
