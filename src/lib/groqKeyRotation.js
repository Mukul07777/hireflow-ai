/**
 * groqKeyRotation.js — round-robin key selection across up to 4 Groq API keys.
 * Pulled out of App.jsx so the rotation logic can be unit tested in isolation.
 */

/** Factory so this is testable without touching import.meta.env or module-level state. */
export function createKeyRotator(keys) {
  const list = (keys || []).filter(Boolean);
  let idx = 0;

  return {
    /** Returns the next key in the rotation, advancing the pointer. Empty string if no keys configured. */
    getKey() {
      if (list.length === 0) return "";
      const k = list[idx % list.length];
      idx++;
      return k;
    },
    /** Index (0-based) that will be used on the *next* getKey() call, for UI display ("key 2 of 4"). */
    get nextIndex() {
      return list.length === 0 ? 0 : idx % list.length;
    },
    get keyCount() {
      return list.length;
    },
  };
}
