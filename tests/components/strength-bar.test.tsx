import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StrengthBar from "@/components/strength-bar";

describe("StrengthBar", () => {
  it("shows 'Very weak' for empty string", () => {
    render(<StrengthBar password="" />);
    expect(screen.getByText("Very weak")).toBeInTheDocument();
  });

  it("shows 'Weak' for a weak password", () => {
    render(<StrengthBar password="abc" />);
    expect(screen.getByText("Weak")).toBeInTheDocument();
  });

  it("shows 'Very strong' for a strong password", () => {
    render(<StrengthBar password="Abcdefghijklmno1!" />);
    expect(screen.getByText("Very strong")).toBeInTheDocument();
  });

  it("label is announced with aria-live", () => {
    render(<StrengthBar password="test" />);
    const label = screen.getByText(/weak|fair|strong/i);
    expect(label).toHaveAttribute("aria-live", "polite");
  });
});
