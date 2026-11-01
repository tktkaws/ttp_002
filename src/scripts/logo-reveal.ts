export function initLogoReveal() {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const logo = document.querySelector<HTMLElement>("[data-logo-random-reveal]");

  if (logo) {
    const characters = Array.from(logo.querySelectorAll<HTMLElement>("[data-logo-char]"));
    const reveal = () => {
      if (!reducedMotion.matches) {
        const order = characters.map((_, index) => index);
        for (let index = order.length - 1; index > 0; index -= 1) {
          const swapIndex = Math.floor(Math.random() * (index + 1));
          [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
        }
        order.forEach((characterIndex, revealIndex) => {
          characters[characterIndex].style.setProperty("--logo-char-delay", `${revealIndex * 48.6}ms`);
        });
      }
      logo.classList.add("logo-random-reveal--visible");
    };

    if (reducedMotion.matches) {
      reveal();
    } else {
      const observer = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        reveal();
        observer.disconnect();
      });
      observer.observe(logo);
    }
  }
}
