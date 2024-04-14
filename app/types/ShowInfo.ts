export type ShowInfo =
  | { status: 'WAITING_FOR_AUDIO_CONTEXT' }
  | { status: 'WAITING_UNTIL_START' };
