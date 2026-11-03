import { enhanceTextCards } from "./enhancement.ts";

class FallingTextCards extends HTMLElement {
  private dispose?: () => void;
  connectedCallback() {
    if (!this.dispose) this.dispose = enhanceTextCards(this);
  }
  disconnectedCallback() {
    this.dispose?.();
    this.dispose = undefined;
  }
}
if (!customElements.get("falling-text-cards"))
  customElements.define("falling-text-cards", FallingTextCards);
