function randomSuffix() {
  const randomValues = globalThis.crypto.getRandomValues(new Uint8Array(4));
  const letters = "abcdefghijklmnopqrstuvwxyz";
  return `${letters[randomValues[0] % 26]}${letters[randomValues[1] % 26]}${randomValues[2] % 10}${randomValues[3] % 10}`;
}

export function generateUsername(name, suffix = randomSuffix()) {
  const nameParts = name.trim().split(/\s+/);
  const prefixParts = /^st\.?$/i.test(nameParts[0])
    ? nameParts.slice(1)
    : nameParts.slice(0, 1);
  const prefix =
    prefixParts
      .join("")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 80) || "entity";
  return `${prefix}${suffix.toLowerCase()}`;
}

export function updateGeneratedUsername(name, currentUsername) {
  const suffix = currentUsername.match(/([a-z]{2}[0-9]{2})$/i)?.[1];
  return generateUsername(name, suffix);
}
