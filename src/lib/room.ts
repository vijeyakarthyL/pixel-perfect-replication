const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function makeRoomCode(length = 5) {
  let code = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i]! % ALPHABET.length];
  return code;
}

export function normaliseRoomCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export function shareLink(code: string) {
  if (typeof window === "undefined") return code;
  return `${window.location.origin}/lobby?room=${code}`;
}
