import {
  defaultPreferences,
  preferenceKeys,
  type Animation,
  type DisplayPreferences,
  type Theme,
} from "../config/preferences";

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

export function setTheme(theme: Theme, save = true) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", theme);
  if (save) persist(preferenceKeys.theme, theme);
}

export function setAnimation(animation: Animation, save = true) {
  document.documentElement.dataset.animation = animation;
  if (save) persist(preferenceKeys.animation, animation);
}
