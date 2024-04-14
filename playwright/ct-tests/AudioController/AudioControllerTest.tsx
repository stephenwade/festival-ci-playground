import { addSeconds } from 'date-fns';
import type { FC } from 'react';

import { AudioController } from '~/components/AudioController';

interface TestProps {
  forceSkipAudioContext: boolean;
}

export const AudioControllerTest: FC<TestProps> = ({
  forceSkipAudioContext,
}) => {
  const now = new Date();

  const targetShowInfo = {
    status: 'WAITING_UNTIL_START' as const,
    secondsUntilSet: 5,
    currentSet: {
      id: 'ccc19b72-4a68-3219-9409-ef1ef0d75643',
      audioUrl:
        'https://festivalci.z13.web.core.windows.net/90-sec-silence.mp3?1',
      artist: 'Artist 1',
      start: addSeconds(now, 5),
      duration: 90,
      end: addSeconds(now, 95),
    },
  };

  return (
    <AudioController
      targetShowInfo={targetShowInfo}
      forceSkipAudioContext={forceSkipAudioContext}
    >
      {({ showInfo, initializeAudio }) => (
        <div>
          <button data-testid="init-button" onClick={initializeAudio}>
            Initialize audio
          </button>
          <p>Show status: {showInfo.status}</p>
        </div>
      )}
    </AudioController>
  );
};
