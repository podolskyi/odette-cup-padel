// Lightweight client-side gate for the admin pages (/add, /settings, /draft).
// This is NOT real security — everything client-side can be reverse-engineered —
// but the secret word never appears in the bundle: we store only its salted
// SHA-256 hash and compare hashes at runtime, so it can't be read from the
// dev console / source. Changing the word = replacing SECRET_HASH:
//
//   node -e "const c=require('crypto');console.log(c.createHash('sha256').update('odette-cup:' + 'NEW-WORD'.toLowerCase()).digest('hex'))"

const SALT = 'odette-cup:'
const SECRET_HASH = 'c9071c0ef5805a8e4953ac3082168c77516ae777db9040d4b79dd2b96029b8a8'

const KEY = 'odette-cup-padel:settings-unlocked'

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isUnlocked(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Returns true if the word matches; remembers the unlock for next time. */
export async function tryUnlock(word: string): Promise<boolean> {
  let ok = false
  try {
    ok = (await sha256Hex(SALT + word.trim().toLowerCase())) === SECRET_HASH
  } catch {
    // Web Crypto unavailable (non-secure context) — fail closed.
    return false
  }
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
