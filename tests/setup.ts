import "@testing-library/jest-dom";

// navigator.clipboard is not implemented in jsdom
Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});
