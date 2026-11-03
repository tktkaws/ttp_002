import { restoreTextCards } from "./fallback.ts";
import type { mountTextCards } from "./physics.ts";

type LoadPhysics = () => Promise<{ mountTextCards: typeof mountTextCards }>;

export function enhanceTextCards(root: HTMLElement, load: LoadPhysics = () => import("./physics.ts")) {
  let disposed = false;
  let cleanup: (() => void) | undefined;
  restoreTextCards(root);
  void Promise.resolve().then(load).then(({ mountTextCards }) => {
    if (!disposed && root.isConnected) cleanup = mountTextCards(root);
  }).catch(() => {
    if (!disposed) restoreTextCards(root);
  });
  return () => {
    disposed = true;
    try { cleanup?.(); } finally { restoreTextCards(root); }
  };
}
