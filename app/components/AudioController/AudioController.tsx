import { differenceInSeconds } from 'date-fns';
import type { FC, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AudioContext } from 'standardized-audio-context';

import type { ShowInfo, TargetShowInfo } from '~/types/ShowInfo';

interface State {
  activeAudio: HTMLAudioElement | null;
  inactiveAudio: HTMLAudioElement | null;

  audioContext: AudioContext | null;
  setVolume: ((volume: number) => void) | null;

  lastTargetShowInfo: TargetShowInfo | null;
  nextChange: ShowInfo | null;

  stalledTimeout: NodeJS.Timeout | null;
}

interface AudioControllerProps {
  targetShowInfo: TargetShowInfo;
  volume: number;
  /** Used in CI */
  forceSkipAudioContext?: boolean;

  children: (args: {
    showInfo: ShowInfo;

    initializeAudio: () => Promise<void>;
  }) => ReactNode;
}

export const AudioController: FC<AudioControllerProps> = ({
  targetShowInfo,
  volume,
  forceSkipAudioContext,
  children,
}) => {
  const [showInfo, setShowInfo] = useState<ShowInfo>(
    targetShowInfo.status === 'ENDED'
      ? { status: 'ENDED' }
      : { status: 'WAITING_FOR_AUDIO_CONTEXT' },
  );

  const audio1Ref = useRef<HTMLAudioElement>(null);
  const audio2Ref = useRef<HTMLAudioElement>(null);

  const stateRef = useRef<State>({
    activeAudio: null,
    inactiveAudio: null,

    audioContext: null,
    setVolume: null,

    lastTargetShowInfo: null,
    nextChange: null,

    stalledTimeout: null,
  });

  const setupAudioContext = useCallback(() => {
    const state = stateRef.current;

    const audioContext = new AudioContext();

    const tracks = [state.activeAudio, state.inactiveAudio].map((audio) => {
      if (audio) {
        return audioContext.createMediaElementSource(audio);
      }
      return null;
    });

    const analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 1024;
    analyserNode.minDecibels = -85;
    analyserNode.smoothingTimeConstant = 0.75;

    const gainNode = audioContext.createGain();
    state.setVolume = (volume) => {
      if (volume < 0) gainNode.gain.value = 0;
      else if (volume > 100) gainNode.gain.value = 1;
      else gainNode.gain.value = volume / 100;
    };

    state.setVolume(volume / 100);

    for (const track of tracks) {
      if (track) {
        track
          .connect(analyserNode)
          .connect(gainNode)
          .connect(audioContext.destination);
      }
    }

    return audioContext;
  }, [volume]);

  const doNextStatusChange = useCallback(() => {
    const state = stateRef.current;

    const change = state.nextChange;
    const activeAudio = state.activeAudio;
    if (change === null || activeAudio === null) {
      return;
    }
    state.nextChange = null;

    const setChanged = change.currentSet !== showInfo.currentSet;
    const nextSrcAlreadySet =
      activeAudio.attributes.getNamedItem('src')?.value ===
      change.currentSet?.audioUrl;
    const shouldChangeSrc = setChanged && !nextSrcAlreadySet;

    let newShowInfo: ShowInfo;

    if (change.status === 'WAITING_UNTIL_START') {
      if (shouldChangeSrc && change.currentSet) {
        activeAudio.src = change.currentSet.audioUrl;
      }

      newShowInfo = {
        currentSet: change.currentSet,
        status: 'WAITING_UNTIL_START',
        secondsUntilSet: change.secondsUntilSet,
        nextSet: change.nextSet,
      };
    } else if (change.status === 'PLAYING') {
      if (shouldChangeSrc && change.currentSet) {
        activeAudio.src = change.currentSet.audioUrl;
      }

      if (change.currentTime > 0) {
        activeAudio.src += `#t=${change.currentTime}`;
      }

      void activeAudio.play();

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

  const updateTime = useCallback(
    (change: TargetShowInfo) => {
      const state = stateRef.current;

      if (state.activeAudio === null) {
        return;
      }

      let newShowInfo: ShowInfo | undefined;

      if (
        showInfo.status === 'WAITING_UNTIL_START' &&
        change.status === 'WAITING_UNTIL_START'
      ) {
        newShowInfo = {
          ...showInfo,
          secondsUntilSet: change.secondsUntilSet,
        };
      } else if (showInfo.status === 'PLAYING' && change.status === 'PLAYING') {
        let delay = change.currentTime - state.activeAudio.currentTime;
        if (
          change.currentSet &&
          showInfo.currentSet &&
          change.currentSet.id !== showInfo.currentSet.id
        ) {
          const setDifference = differenceInSeconds(
            change.currentSet.start,
            showInfo.currentSet.start,
          );
          delay += setDifference;
        }

        if (delay < 0) delay = 0;

        newShowInfo = {
          ...showInfo,
          delay,
        };
      }

      if (newShowInfo) {
        setShowInfo(newShowInfo);
      }
    },
    [showInfo],
  );

  const checkTargetShowInfo = useCallback(
    ({ ignoreAudioContext = false } = {}) => {
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

        if (timeChanged) {
          updateTime(targetShowInfo);
        }
      }
    },
    [queueStatusChange, showInfo.status, targetShowInfo, updateTime],
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

    for (const audio of [audio1Ref.current, audio2Ref.current]) {
      if (audio) {
        // Safari: activate the audio element by trying to play
        audio.play().catch(() => {
          // ignore errors
        });
        // Firefox: if you don't pause after trying to play, it will start to play
        // as soon as src is set
        audio.pause();
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
  }, [
    checkTargetShowInfo,
    forceSkipAudioContext,
    setupAudioContext,
    targetShowInfo.status,
  ]);

  // This will only run once.
  useEffect(() => {
    const state = stateRef.current;

    state.activeAudio = audio1Ref.current;
    state.inactiveAudio = audio2Ref.current;
  }, []);

  useEffect(() => {
    const state = stateRef.current;

    checkTargetShowInfo();
    state.setVolume?.(volume);
  }, [checkTargetShowInfo, volume]);

  return (
    <>
      {children({
        showInfo,

        initializeAudio,
      })}
      <audio ref={audio1Ref} crossOrigin="anonymous" />
      <audio ref={audio2Ref} crossOrigin="anonymous" />
    </>
  );
};
