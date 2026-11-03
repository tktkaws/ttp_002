import { initReveal } from "./reveal.ts";

export function initLogoReveal() {
  return initReveal("[data-logo-random-reveal]", (logo, track) => {
    const characters = [...logo.querySelectorAll<HTMLElement>("[data-logo-char]")];
    for (let index = characters.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [characters[index], characters[other]] = [characters[other], characters[index]];
    }
    characters.forEach((character, index) => {
      track(character.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: 324,
        delay: index * 48.6,
        easing: "ease-out",
        fill: "backwards",
      }));
    });
  });
}
