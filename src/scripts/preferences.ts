import {
  defaultPreferences,
  preferenceKeys,
  type Animation,
  type DisplayPreferences,
  type Theme,
} from "../config/preferences.ts";

export const preferencesChangeEvent = "portfolio:preferenceschange";

export function readStoredPreferences(fallback: DisplayPreferences = defaultPreferences): DisplayPreferences {
  const read = (key: string, otherwise: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return otherwise;
    }
  };
  const theme = read(preferenceKeys.theme, fallback.theme);
  const animation = read(preferenceKeys.animation, fallback.animation);
  return {
    theme: theme === "light" || theme === "dark" ? theme : defaultPreferences.theme,
    animation: animation === "off" || animation === "on" ? animation : defaultPreferences.animation,
  };
}

function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Settings remain usable when browser storage is unavailable.
  }
}

export function getPreferences(): DisplayPreferences {
  const { theme, animation } = document.documentElement.dataset;
  return {
    theme: theme === "light" || theme === "dark" ? theme : defaultPreferences.theme,
    animation: animation === "off" || animation === "on" ? animation : defaultPreferences.animation,
  };
}

function applyPreferences({ theme, animation }: DisplayPreferences) {
  const root = document.documentElement;
  if (root.dataset.theme !== theme) root.dataset.theme = theme;
  if (root.dataset.animation !== animation) root.dataset.animation = animation;
  root.classList.toggle("dark", theme === "dark");
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", theme);
  document.dispatchEvent(new CustomEvent(preferencesChangeEvent, { detail: { theme, animation } }));
}

export function setTheme(theme: Theme, save = true) {
  applyPreferences({ ...getPreferences(), theme });
  if (save) persist(preferenceKeys.theme, theme);
}

export function setAnimation(animation: Animation, save = true) {
  applyPreferences({ ...getPreferences(), animation });
  if (save) persist(preferenceKeys.animation, animation);
}

export function initPreferenceSync() {
  const restore = () => applyPreferences(readStoredPreferences(getPreferences()));
  const onStorage = (event: StorageEvent) => {
    try {
      if (event.storageArea !== localStorage) return;
    } catch {
      return;
    }
    if (event.key === null || event.key === preferenceKeys.theme || event.key === preferenceKeys.animation) {
      restore();
    }
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("pageshow", restore);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("pageshow", restore);
  };
}
