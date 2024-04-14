import type { FC } from 'react';

import { AudioController } from '~/components/AudioController';

interface TestProps {
  forceSkipAudioContext: boolean;
}

export const AudioControllerTest: FC<TestProps> = ({
  forceSkipAudioContext,
}) => {
  return (
    <AudioController forceSkipAudioContext={forceSkipAudioContext}>
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
