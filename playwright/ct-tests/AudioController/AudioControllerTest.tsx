import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { createRemixStub } from '@remix-run/testing';
import { addSeconds } from 'date-fns';
import type { FC } from 'react';

import { AudioController } from '~/components/AudioController';
import { useShowInfo } from '~/hooks/useShowInfo';

interface TestProps {
  forceSkipAudioContext: boolean;
}

function AudioControllerDisplay() {
  const { forceSkipAudioContext } = useLoaderData<TestProps>();

  const now = new Date();

  const { targetShowInfo: _ } = useShowInfo(
    {
      serverDate: now.toISOString(),
      sets: [
        {
          id: 'ccc19b72-4a68-3219-9409-ef1ef0d75643',
          audioUrl:
            'https://festivalci.z13.web.core.windows.net/90-sec-silence.mp3?1',
          artist: 'Artist 1',
          start: addSeconds(now, 5).toISOString(),
          duration: 90,
        },
      ],
    },
    { ci: true },
  );
  // console.log(JSON.stringify(targetShowInfo));
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
}

export const AudioControllerTest: FC<TestProps> = (props) => {
  const RemixStub = createRemixStub([
    {
      path: '/',
      Component: AudioControllerDisplay,
      loader() {
        return json(props);
      },
    },
  ]);

  return <RemixStub />;
};
