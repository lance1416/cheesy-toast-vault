import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PasswordInput from "@/app/(auth)/password-input";

function renderInput(show = false, onToggle = vi.fn(), onChange = vi.fn()) {
  return render(
    <PasswordInput
      id="pw"
      value="secret"
      onChange={onChange}
      placeholder="Enter password"
      show={show}
      onToggle={onToggle}
    />,
  );
}

describe("PasswordInput", () => {
  it("renders as type=password when show=false", () => {
    renderInput(false);
    expect(screen.getByPlaceholderText("Enter password")).toHaveAttribute("type", "password");
  });

  it("renders as type=text when show=true", () => {
    renderInput(true);
    expect(screen.getByPlaceholderText("Enter password")).toHaveAttribute("type", "text");
  });

  it("toggle button has aria-pressed=false when hidden", () => {
    renderInput(false);
    expect(screen.getByRole("button", { name: /show password/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("toggle button has aria-pressed=true when shown", () => {
    renderInput(true);
    expect(screen.getByRole("button", { name: /hide password/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("clicking toggle calls onToggle", async () => {
    const onToggle = vi.fn();
    renderInput(false, onToggle);
    await userEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("typing calls onChange with new value", async () => {
    const onChange = vi.fn();
    render(<PasswordInput id="pw" value="" onChange={onChange} show={false} onToggle={vi.fn()} />);
    await userEvent.type(document.getElementById("pw")!, "a");
    expect(onChange).toHaveBeenCalledWith("a");
  });
});
