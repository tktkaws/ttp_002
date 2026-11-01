export function initHeadingReveal() {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const headings = document.querySelectorAll<HTMLElement>("[data-heading-reveal]");

  if (headings.length > 0) {
    const reveal = (heading: HTMLElement) => heading.classList.add("heading-reveal--visible");

    if (reducedMotion.matches) {
      headings.forEach(reveal);
    } else {
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      });
      headings.forEach((heading) => observer.observe(heading));
    }
  }
}
