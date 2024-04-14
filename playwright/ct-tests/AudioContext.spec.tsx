import { expect, test } from '@playwright/experimental-ct-react';

import { AudioControllerTest } from './AudioContextTest';

test('can resume an AudioContext', async ({ mount }) => {
  const component = await mount(<AudioControllerTest />);

  await expect(component).toContainText('Audio context ready: no');

  await component.getByRole('button').click();

  await expect(component).toContainText('Audio context ready: yes');
});
