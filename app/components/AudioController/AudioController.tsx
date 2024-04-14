import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioContext } from 'standardized-audio-context';

import type { ShowInfo } from '~/types/ShowInfo';

interface State {
  audio: HTMLAudioElement | null;
  audioContext: AudioContext | null;

  lastTargetShowInfo: ShowInfo | null;
  nextChange: ShowInfo | null;
}

interface AudioControllerProps {
  /** Used in CI */
  forceSkipAudioContext?: boolean;

  children: (args: {
    showInfo: ShowInfo;
    initializeAudio: () => Promise<void>;
  }) => ReactNode;
}

export const AudioController: FC<AudioControllerProps> = ({
  forceSkipAudioContext,
  children,
}) => {
  const [showInfo, setShowInfo] = useState<ShowInfo>({
    status: 'WAITING_FOR_AUDIO_CONTEXT',
  });

  const audioRef = useRef<HTMLAudioElement>(null);

  const stateRef = useRef<State>({
    audio: null,
    audioContext: null,

    lastTargetShowInfo: null,
    nextChange: null,
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

  const doNextStatusChange = useCallback(() => {
    const state = stateRef.current;

    const change = state.nextChange;
    const audio = state.audio;
    if (change === null || audio === null) {
      return;
    }
    state.nextChange = null;

    let newShowInfo: ShowInfo;

    if (change.status === 'WAITING_UNTIL_START') {
      newShowInfo = {
        status: 'WAITING_UNTIL_START',
      };
    } else {
      throw new Error('Unknown status');
    }

    setShowInfo(newShowInfo);
  }, []);

  const queueStatusChange = useCallback(
    (change: ShowInfo) => {
      const state = stateRef.current;

      state.nextChange = change;

      doNextStatusChange();
    },
    [doNextStatusChange, showInfo.status],
  );

  const checkTargetShowInfo = useCallback(
    ({ ignoreAudioContext = false } = {}) => {
      const targetShowInfo: ShowInfo = {
        status: 'WAITING_UNTIL_START',
      };

      const state = stateRef.current;

      const waitingForAudioContext =
        !ignoreAudioContext && showInfo.status === 'WAITING_FOR_AUDIO_CONTEXT';

      if (waitingForAudioContext) return;

      const lastTargetShowInfo = state.lastTargetShowInfo;

      const firstRun = !lastTargetShowInfo;
      if (firstRun) {
        state.lastTargetShowInfo = targetShowInfo;
        queueStatusChange(targetShowInfo);
      } else {
        const statusChanged =
          targetShowInfo.status !== lastTargetShowInfo.status;

        state.lastTargetShowInfo = targetShowInfo;

        if (statusChanged) {
          queueStatusChange(targetShowInfo);
        }
      }
    },
    [queueStatusChange, showInfo.status],
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

    const audio = audioRef.current;
    if (audio) {
      // Safari: activate the audio element by trying to play
      audio.play().catch(() => {
        // ignore errors
      });
      // Firefox: if you don't pause after trying to play, it will start to play
      // as soon as src is set
      audio.pause();
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
        showInfo,
        initializeAudio,
      })}
      <audio ref={audioRef} crossOrigin="anonymous" />
    </>
  );
};
