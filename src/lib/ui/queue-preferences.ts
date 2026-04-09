export function loadQueuePreference<T extends string>(key: string, allowedValues: readonly T[], fallback: T) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const value = window.localStorage.getItem(key);
  return value && allowedValues.includes(value as T) ? (value as T) : fallback;
}

export function loadQueueTextPreference(key: string, fallback = "") {
  if (typeof window === "undefined") {
    return fallback;
  }

  return window.localStorage.getItem(key) ?? fallback;
}

export function saveQueuePreference(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value);
}
