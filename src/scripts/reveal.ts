import { preferencesChangeEvent } from "./preferences.ts";

type TrackAnimation = (animation: Animation) => void;

// Animate the ink layer while the gray text underneath stays visible.
export function initReveal(
  selector: string,
  animate: (element: HTMLElement, track: TrackAnimation) => void,
) {
  const elements = [...document.querySelectorAll<HTMLElement>(selector)];
  const animations = new Set<Animation>();
  const revealed = new Set<HTMLElement>();
  let observer: IntersectionObserver | undefined;
  let reduced: MediaQueryList | undefined;
  let enabled = false;

  const stop = () => {
    observer?.disconnect();
    observer = undefined;
    for (const animation of animations) animation.cancel();
    animations.clear();
    for (const element of elements) element.dataset.revealed = "true";
  };
  const track: TrackAnimation = (animation) => {
    animations.add(animation);
    animation.finished.then(
      () => animations.delete(animation),
      () => animations.delete(animation),
    );
  };
  const setup = () => {
    const next =
      document.documentElement.dataset.animation === "on" && !reduced?.matches;
    if (next === enabled) return;
    enabled = next;
    stop();
    if (!enabled) return;
    for (const element of elements) {
      if (!revealed.has(element)) delete element.dataset.revealed;
    }
    try {
      observer = new IntersectionObserver((entries) => {
        try {
          for (const entry of entries) {
            if (!entry.isIntersecting || !enabled) continue;
            const element = entry.target as HTMLElement;
            observer?.unobserve(element);
            if (revealed.has(element)) continue;
            revealed.add(element);
            element.dataset.revealed = "true";
            animate(element, track);
          }
        } catch {
          stop();
        }
      });
      for (const element of elements) observer.observe(element);
    } catch {
      stop();
    }
  };
  const pause = () => {
    stop();
    enabled = false;
  };
  const dispose = () => {
    pause();
    document.removeEventListener(preferencesChangeEvent, setup);
    reduced?.removeEventListener?.("change", setup);
    window.removeEventListener("pagehide", pause);
    window.removeEventListener("pageshow", setup);
  };

  try {
    if (
      !elements.length ||
      elements.some((element) => typeof element.animate !== "function")
    ) {
      stop();
      return dispose;
    }
    reduced = matchMedia("(prefers-reduced-motion: reduce)");
    document.addEventListener(preferencesChangeEvent, setup);
    reduced.addEventListener("change", setup);
    window.addEventListener("pagehide", pause);
    window.addEventListener("pageshow", setup);
    setup();
  } catch {
    dispose();
  }
  return dispose;
}
