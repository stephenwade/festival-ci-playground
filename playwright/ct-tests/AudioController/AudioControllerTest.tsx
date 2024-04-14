import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { createRemixStub } from '@remix-run/testing';
import { addSeconds } from 'date-fns';
import type { FC } from 'react';
import { useDeepCompareMemo } from 'use-deep-compare';

import { AudioController } from '~/components/AudioController';
import { useShowInfo } from '~/hooks/useShowInfo';
import type { ShowData } from '~/types/ShowData';

interface GetMockDataProps {
  offsetSec?: number;
}

function getMockData({
  offsetSec = -5,
}: GetMockDataProps): Pick<ShowData, 'serverDate' | 'sets'> {
  const now = new Date();

  const sets: ShowData['sets'] = [
    {
      id: 'ccc19b72-4a68-3219-9409-ef1ef0d75643',
      audioUrl:
        'https://festivalci.z13.web.core.windows.net/90-sec-silence.mp3?1',
      artist: 'Artist 1',
      start: addSeconds(now, 0 - offsetSec).toISOString(),
      duration: 90,
    },
  ];

  return {
    serverDate: now.toISOString(),
    sets,
  };
}

interface TestProps extends GetMockDataProps {
  forceSkipAudioContext: boolean;
}

function AudioControllerDisplay() {
  const { forceSkipAudioContext, ...props } = useLoaderData<TestProps>();

  const data = useDeepCompareMemo(() => getMockData(props), [props]);
  const { targetShowInfo } = useShowInfo(data, { ci: true });

  return (
    <AudioController
      targetShowInfo={targetShowInfo}
      volume={42}
      forceSkipAudioContext={forceSkipAudioContext}
    >
      {({ showInfo, initializeAudio }) => (
        <div>
          <p>
            <button data-testid="init-button" onClick={initializeAudio}>
              Initialize audio
            </button>
          </p>
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
