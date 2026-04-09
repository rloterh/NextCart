import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        React.forwardRef(({ children, ...props }: React.HTMLAttributes<HTMLElement>, ref: React.ForwardedRef<HTMLElement>) =>
          React.createElement(tag, { ...props, ref }, children)
        ),
    }
  ),
  useReducedMotion: () => false,
}));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
