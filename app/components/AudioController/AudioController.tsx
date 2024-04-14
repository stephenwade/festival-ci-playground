import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioContext } from 'standardized-audio-context';

import type { ShowInfo, TargetShowInfo } from '~/types/ShowInfo';

interface State {
  audio: HTMLAudioElement | null;
  audioContext: AudioContext | null;

  lastTargetShowInfo: TargetShowInfo | null;
  nextChange: ShowInfo | null;
}

interface AudioControllerProps {
  targetShowInfo: TargetShowInfo;
  /** Used in CI */
  forceSkipAudioContext?: boolean;

  children: (args: {
    showInfo: ShowInfo;

    initializeAudio: () => Promise<void>;
  }) => ReactNode;
}

export const AudioController: FC<AudioControllerProps> = ({
  targetShowInfo,
  forceSkipAudioContext,
  children,
}) => {
  const [showInfo, setShowInfo] = useState<ShowInfo>(
    targetShowInfo.status === 'ENDED'
      ? { status: 'ENDED' }
      : { status: 'WAITING_FOR_AUDIO_CONTEXT' },
  );

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

    const tracks = [
      state.audio ? audioContext.createMediaElementSource(state.audio) : null,
    ];

    const analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 1024;
    analyserNode.minDecibels = -85;
    analyserNode.smoothingTimeConstant = 0.75;

    const gainNode = audioContext.createGain();

    for (const track of tracks) {
      if (track) {
        track
          .connect(analyserNode)
          .connect(gainNode)
          .connect(audioContext.destination);
      }
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

    const setChanged = change.currentSet !== showInfo.currentSet;
    const nextSrcAlreadySet =
      audio.attributes.getNamedItem('src')?.value ===
      change.currentSet?.audioUrl;
    const shouldChangeSrc = setChanged && !nextSrcAlreadySet;

    let newShowInfo: ShowInfo;

    if (change.status === 'WAITING_UNTIL_START') {
      if (shouldChangeSrc && change.currentSet) {
        audio.src = change.currentSet.audioUrl;
      }

      newShowInfo = {
        currentSet: change.currentSet,
        status: 'WAITING_UNTIL_START',
        secondsUntilSet: change.secondsUntilSet,
        nextSet: change.nextSet,
      };
    } else if (change.status === 'PLAYING') {
      if (shouldChangeSrc && change.currentSet) {
        audio.src = change.currentSet.audioUrl;
      }

      if (change.currentTime > 0) {
        audio.src += `#t=${change.currentTime}`;
      }

      void audio.play();

      newShowInfo = {
        currentSet: change.currentSet,
        status: 'PLAYING',
        currentTime: change.currentTime,
        nextSet: change.nextSet,
      };
    } else if (change.status === 'ENDED') {
      newShowInfo = { status: 'ENDED' };
    } else {
      throw new Error('Unknown status');
    }

    setShowInfo(newShowInfo);
  }, [showInfo.currentSet]);

  const queueStatusChange = useCallback(
    (change: ShowInfo) => {
      const state = stateRef.current;

      state.nextChange = change;

      if (showInfo.status !== 'PLAYING') {
        doNextStatusChange();
      }
    },
    [doNextStatusChange, showInfo.status],
  );

  const checkTargetShowInfo = useCallback(
    ({ ignoreAudioContext = false } = {}) => {
      if (1) return;

      const state = stateRef.current;

      const ended = targetShowInfo.status === 'ENDED';
      const waitingForAudioContext =
        !ignoreAudioContext && showInfo.status === 'WAITING_FOR_AUDIO_CONTEXT';

      if (waitingForAudioContext && !ended) return;

      const lastTargetShowInfo = state.lastTargetShowInfo;

      const firstRun = !lastTargetShowInfo;
      if (firstRun) {
        state.lastTargetShowInfo = targetShowInfo;
        queueStatusChange(targetShowInfo);
      } else {
        const statusChanged =
          targetShowInfo.status !== lastTargetShowInfo.status;
        const setChanged =
          targetShowInfo.currentSet?.id !== lastTargetShowInfo.currentSet?.id;
        const secondsUntilSetChanged =
          targetShowInfo.status === 'WAITING_UNTIL_START' &&
          lastTargetShowInfo.status === 'WAITING_UNTIL_START' &&
          targetShowInfo.secondsUntilSet !== lastTargetShowInfo.secondsUntilSet;
        const currentTimeChanged =
          targetShowInfo.status === 'PLAYING' &&
          lastTargetShowInfo.status === 'PLAYING' &&
          targetShowInfo.currentTime !== lastTargetShowInfo.currentTime;

        const timeChanged = secondsUntilSetChanged || currentTimeChanged;
        const anythingChanged = timeChanged || statusChanged || setChanged;

        state.lastTargetShowInfo = targetShowInfo;

        if (anythingChanged) {
          queueStatusChange(targetShowInfo);
        }
      }
    },
    [queueStatusChange, showInfo.status, targetShowInfo],
  );

  const initializeAudio = useCallback(async () => {
    if (targetShowInfo.status === 'ENDED') return;

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
  }, [
    checkTargetShowInfo,
    forceSkipAudioContext,
    setupAudioContext,
    targetShowInfo.status,
  ]);

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
