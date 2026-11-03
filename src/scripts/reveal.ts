import { preferencesChangeEvent } from "./preferences.ts";

type TrackAnimation = (animation: Animation) => void;

// Content stays visible until a finite Web Animation actually starts.
export function initReveal(selector: string, animate: (element: HTMLElement, track: TrackAnimation) => void) {
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
  };
  const track: TrackAnimation = (animation) => {
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
  };
  const setup = () => {
    const next = document.documentElement.dataset.animation === "on" && !reduced?.matches;
    if (next === enabled) return;
    enabled = next;
    stop();
    if (!enabled) return;
    try {
      observer = new IntersectionObserver((entries) => {
        try {
          for (const entry of entries) {
            if (!entry.isIntersecting || !enabled) continue;
            const element = entry.target as HTMLElement;
            observer?.unobserve(element);
            if (revealed.has(element)) continue;
            revealed.add(element);
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
  const pause = () => { stop(); enabled = false; };
  const dispose = () => {
    pause();
    document.removeEventListener(preferencesChangeEvent, setup);
    reduced?.removeEventListener?.("change", setup);
    window.removeEventListener("pagehide", pause);
    window.removeEventListener("pageshow", setup);
  };

  try {
    if (!elements.length || elements.some((element) => typeof element.animate !== "function")) return dispose;
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
