import type { FC, ReactNode } from 'react';
import { useCallback, useRef, useState } from 'react';

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

  const setupAudioContext = useCallback(() => {
    const audioContext = new AudioContext();

    // const track = audioContext.createMediaElementSource(audioRef.current!);

    // const analyserNode = audioContext.createAnalyser();
    // analyserNode.fftSize = 1024;
    // analyserNode.minDecibels = -85;
    // analyserNode.smoothingTimeConstant = 0.75;

    // const gainNode = audioContext.createGain();

    // if (track) {
    //   track
    //     .connect(analyserNode)
    //     .connect(gainNode)
    //     .connect(audioContext.destination);
    // }

    return audioContext;
  }, []);

  const initializeAudio = useCallback(async () => {
    if (!forceSkipAudioContext) {
      try {
        const audioContext = setupAudioContext();
        await audioContext.resume();
      } catch {
        // ignore errors
      }
    }

    setAudioContextReady(true);
  }, [forceSkipAudioContext, setupAudioContext]);

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
