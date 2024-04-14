import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioContext } from 'standardized-audio-context';

interface State {
  audio: HTMLAudioElement | null;
  audioContext: AudioContext | null;
}

interface AudioControllerProps {
  /** Used in CI */
  forceSkipAudioContext?: boolean;

  children: (args: {
    audioContextReady: boolean;
    initializeAudio: () => Promise<void>;
  }) => ReactNode;
}

export const AudioController: FC<AudioControllerProps> = ({
  forceSkipAudioContext,
  children,
}) => {
  const [audioContextReady, setAudioContextReady] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  const stateRef = useRef<State>({
    audio: null,
    audioContext: null,
  });

  const setupAudioContext = useCallback(() => {
    const state = stateRef.current;

    const audioContext = new AudioContext();

    const track = state.audio
      ? audioContext.createMediaElementSource(state.audio)
      : null;

    const analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 1024;
    analyserNode.minDecibels = -85;
    analyserNode.smoothingTimeConstant = 0.75;

    const gainNode = audioContext.createGain();

    if (track) {
      track
        .connect(analyserNode)
        .connect(gainNode)
        .connect(audioContext.destination);
    }

    return audioContext;
  }, []);

  const doStatusChange = useCallback((audioContextReady: boolean) => {
    const state = stateRef.current;

    const audio = state.audio;
    if (audio === null) {
      return;
    }

    if (audioContextReady) {
      setAudioContextReady(true);
    }
  }, []);

  const checkTargetShowInfo = useCallback(
    ({ ignoreAudioContext = false } = {}) => {
      const waitingForAudioContext = !ignoreAudioContext && !audioContextReady;

      if (waitingForAudioContext) return;

      doStatusChange(true);
    },
    [doStatusChange, audioContextReady],
  );

  const initializeAudio = useCallback(async () => {
    const state = stateRef.current;

    if (!forceSkipAudioContext) {
      try {
        state.audioContext = setupAudioContext();
      } catch {
        // ignore errors
      }
    }

    if (state.audioContext) {
      try {
        await state.audioContext.resume();
      } catch {
        // ignore errors
      }
    }

    checkTargetShowInfo({ ignoreAudioContext: true });
  }, [checkTargetShowInfo, forceSkipAudioContext, setupAudioContext]);

  // This will only run once.
  useEffect(() => {
    const state = stateRef.current;

    state.audio = audioRef.current;
  }, []);

  useEffect(() => {
    checkTargetShowInfo();
  }, [checkTargetShowInfo]);

  return (
    <>
      {children({
        audioContextReady,
        initializeAudio,
      })}
      <audio ref={audioRef} crossOrigin="anonymous" />
    </>
  );
};
