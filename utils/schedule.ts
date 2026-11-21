import { setTimeout } from 'node:timers/promises'

const DEFAULT_JITTER_SECONDS = 300

export async function waitForScheduledAttendance(jitterSeconds?: string | number) {
  const seconds = Number(String(jitterSeconds ?? '').trim() || DEFAULT_JITTER_SECONDS)
  const maxDelay = Number.isInteger(seconds) && seconds >= 0 && seconds <= DEFAULT_JITTER_SECONDS
    ? seconds
    : DEFAULT_JITTER_SECONDS

  if (maxDelay > 0)
    await setTimeout(Math.floor(Math.random() * (maxDelay + 1)) * 1000)
}
