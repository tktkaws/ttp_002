import {
  getPreferences,
  preferencesChangeEvent,
  setAnimation,
  setTheme,
} from "./preferences.ts";

export function initPreferenceControls(
  controls = document.querySelector<HTMLElement>("[data-preference-controls]"),
) {
  if (!controls) return () => {};
  const animation = controls.querySelector<HTMLButtonElement>(
    "[data-animation-toggle]",
  );
  const theme = controls.querySelector<HTMLButtonElement>(
    "[data-theme-toggle]",
  );
  const abort = new AbortController();
  const cleanup = () => {
    abort.abort();
    delete controls.dataset.enhanced;
    if (animation) animation.disabled = true;
    if (theme) theme.disabled = true;
  };
  if (!animation || !theme) return cleanup;
  const safely = (action: () => void) => () => {
    try {
      action();
    } catch {
      cleanup();
    }
  };
  try {
    const sync = () => {
      const state = getPreferences();
      animation.textContent = `モーション：${state.animation === "on" ? "オン" : "オフ"}`;
      animation.setAttribute("aria-pressed", String(state.animation === "on"));
      animation.title =
        state.animation === "on"
          ? "アニメーションを止める"
          : "アニメーションを動かす";
      theme.textContent = `テーマ：${state.theme === "dark" ? "ダーク" : "ライト"}`;
      theme.setAttribute("aria-pressed", String(state.theme === "dark"));
      theme.title =
        state.theme === "dark"
          ? "ライトテーマに切り替える"
          : "ダークテーマに切り替える";
    };
    const options = { signal: abort.signal };
    animation.addEventListener(
      "click",
      safely(() =>
        setAnimation(getPreferences().animation === "on" ? "off" : "on"),
      ),
      options,
    );
    theme.addEventListener(
      "click",
      safely(() =>
        setTheme(getPreferences().theme === "dark" ? "light" : "dark"),
      ),
      options,
    );
    document.addEventListener(preferencesChangeEvent, safely(sync), options);
    sync();
    animation.disabled = theme.disabled = false;
    controls.dataset.enhanced = "true";
  } catch {
    cleanup();
  }
  return cleanup;
}
