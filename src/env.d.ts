/// <reference types="vite/client" />

declare module 'bootstrap' {
  export class Modal {
    constructor(element: Element | string, options?: Record<string, unknown>);
    show(): void;
    hide(): void;
    dispose(): void;
    static getInstance(element: Element | string): Modal | null;
    static getOrCreateInstance(element: Element | string, options?: Record<string, unknown>): Modal;
  }
  export class Toast {
    constructor(element: Element | string, options?: Record<string, unknown>);
    show(): void;
    hide(): void;
    dispose(): void;
    static getInstance(element: Element | string): Toast | null;
    static getOrCreateInstance(element: Element | string, options?: Record<string, unknown>): Toast;
  }
  export class Offcanvas {
    constructor(element: Element | string, options?: Record<string, unknown>);
    show(): void;
    hide(): void;
    dispose(): void;
    static getInstance(element: Element | string): Offcanvas | null;
    static getOrCreateInstance(element: Element | string, options?: Record<string, unknown>): Offcanvas;
  }
  export class Dropdown {
    constructor(element: Element | string, options?: Record<string, unknown>);
    show(): void;
    hide(): void;
    toggle(): void;
    static getInstance(element: Element | string): Dropdown | null;
    static getOrCreateInstance(element: Element | string, options?: Record<string, unknown>): Dropdown;
  }
}
