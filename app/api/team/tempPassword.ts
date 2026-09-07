import { randomBytes } from "crypto";

// Excludes visually-confusable characters (0/O, 1/l/I) — this still gets
// shown in the dialog as a fallback in case the invite email doesn't send.
const PASSWORD_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generateTempPassword() {
  // Math.random().toString(36) does NOT reliably produce a fixed-length
  // string — JS drops trailing zero bits in the float→string conversion,
  // so slice(2, 10) could silently come back shorter than 8 characters,
  // intermittently landing under Clerk's minimum password length and
  // getting the whole request rejected. Drawing from crypto.randomBytes
  // into a fixed-size loop guarantees the real length every time.
  const bytes = randomBytes(12);
  let random = "";
  for (const byte of bytes) {
    random += PASSWORD_CHARSET[byte % PASSWORD_CHARSET.length];
  }
  // Fixed prefix/suffix guarantee upper/lower/symbol/digit are all present
  // regardless of what the random draw contains.
  return `Sp!${random}9`;
}
