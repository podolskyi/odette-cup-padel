// Lightweight client-side gate for the hidden /settings page.
// This is NOT real security — it's just a JS check so the page isn't stumbled
// into by casual users. Change the secret word here.

export const SETTINGS_SECRET = 'odette2691'

const KEY = 'odette-cup-padel:settings-unlocked'

export function isUnlocked(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Returns true if the word matches; remembers the unlock for next time. */
export function tryUnlock(word: string): boolean {
  const ok = word.trim().toLowerCase() === SETTINGS_SECRET.toLowerCase()
  if (ok) {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
  }
  return ok
}

export function lockSettings(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
