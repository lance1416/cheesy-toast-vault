import "@testing-library/jest-dom";
import { vi } from "vitest";

// navigator.clipboard is not implemented in jsdom
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
