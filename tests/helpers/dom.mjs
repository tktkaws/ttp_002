export class ElementStub extends EventTarget {
  isConnected = true;
  attributes = new Map();
  dataset = {};
  style = {
    setProperty(name, value) {
      this[name] = value;
    },
    getPropertyValue(name) {
      return (
        this[name] ??
        this[name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] ??
        ""
      );
    },
    removeProperty(name) {
      delete this[name];
      delete this[
        name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
      ];
    },
  };
  classes = new Set();
  classList = {
    add: (name) => this.classes.add(name),
    contains: (name) => this.classes.has(name),
    remove: (name) => this.classes.delete(name),
    toggle: (name, enabled) =>
      enabled ? this.classes.add(name) : this.classes.delete(name),
  };
  get tabIndex() {
    return Number(this.getAttribute("tabindex") ?? -1);
  }
  hasAttribute(name) {
    return this.attributes.has(name);
  }
  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === "style")
      for (const key of Object.keys(this.style))
        if (typeof this.style[key] !== "function") delete this.style[key];
  }
  querySelector() {
    return null;
  }
  querySelectorAll() {
    return [];
  }
  replaceChildren(...children) {
    this.children = children;
  }
  contains(node) {
    return (
      node === this ||
      Boolean(node?.parentElement && this.contains(node.parentElement))
    );
  }
  closest() {
    return this.parentElement?.closest() ?? null;
  }
  focus(options) {
    this.focusOptions = options;
    this.focusCount = (this.focusCount ?? 0) + 1;
  }
}

export class AnchorStub extends ElementStub {
  constructor(href, target = "") {
    super();
    this.href = href;
    this.target = target;
  }
  closest() {
    return this;
  }
}

export function createDOM({
  saved = {},
  deniedKeys = [],
  href = "http://localhost:4321/",
} = {}) {
  const root = new ElementStub();
  Object.assign(root.dataset, { theme: "light", animation: "off" });
  const meta = new ElementStub();
  meta.setAttribute("content", "light");
  const targets = new Map();
  const document = new EventTarget();
  Object.assign(document, {
    readyState: "complete",
    documentElement: root,
    querySelector: () => meta,
    getElementById: (id) => targets.get(id) ?? null,
  });
  const values = new Map(Object.entries(saved));
  const writes = [];
  const storage = {
    getItem(key) {
      if (deniedKeys.includes(key)) throw new Error("Storage unavailable");
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      if (deniedKeys.includes(key)) throw new Error("Storage unavailable");
      values.set(key, value);
      writes.push([key, value]);
    },
  };
  return {
    document,
    window: new EventTarget(),
    root,
    meta,
    targets,
    storage,
    values,
    writes,
    location: new URL(href),
  };
}

export function installDOM(t, options, extraGlobals = {}) {
  const dom = createDOM(options);
  const globals = {
    document: dom.document,
    window: dom.window,
    location: dom.location,
    localStorage: dom.storage,
    Element: ElementStub,
    HTMLElement: ElementStub,
    HTMLAnchorElement: AnchorStub,
    Node: ElementStub,
    ...extraGlobals,
  };
  const descriptors = Object.fromEntries(
    Object.keys(globals).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, { configurable: true, value });
  t.after(() => {
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return dom;
}

export function eventWith(type, values = {}) {
  const event = new Event(type, { cancelable: true });
  for (const [key, value] of Object.entries(values))
    Object.defineProperty(event, key, { value });
  return event;
}
