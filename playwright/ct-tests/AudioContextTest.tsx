import { useState, type FC } from 'react';

async function createAudioContext() {
  const context = new AudioContext();
  await context.resume();
}

export const AudioControllerTest: FC = () => {
  const [ready, setReady] = useState(false);

  return (
    <div>
      <button
        onClick={async () => {
          await createAudioContext();
          setReady(true);
        }}
      >
        Create audio context
      </button>
      <p>Audio context ready: {ready ? 'yes' : 'no'}</p>
    </div>
  );
};
