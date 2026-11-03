import { initReveal } from "./reveal.ts";

export function initHeadingReveal() {
  return initReveal("[data-heading-reveal]", (heading, track) => {
    track(heading.animate(
      [{ clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0 0 0)" }],
      { duration: 250, easing: "ease-out" },
    ));
  });
}
