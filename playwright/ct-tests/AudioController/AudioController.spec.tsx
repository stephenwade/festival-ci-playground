import { expect, test } from '@playwright/experimental-ct-react';

import { AudioControllerTest } from './AudioControllerTest';

test.describe.configure({ retries: 5 });

function tests({ forceSkipAudioContext }: { forceSkipAudioContext: boolean }) {
  test('calling initializeAudio() sets the show status', async ({ mount }) => {
    const component = await mount(
      <AudioControllerTest forceSkipAudioContext={forceSkipAudioContext} />,
    );

    await expect(component).toContainText('Audio context ready: no');

    await component.getByTestId('init-button').click();

    await expect(component).toContainText('Audio context ready: yes');
  });
}

test.describe('with AudioContext', () => {
  tests({ forceSkipAudioContext: false });
});

test.describe('without AudioContext', () => {
  tests({ forceSkipAudioContext: true });
});
