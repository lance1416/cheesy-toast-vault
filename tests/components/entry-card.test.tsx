import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DecryptedEntry } from "@/types/vault";

// Mock checkBreach to avoid network calls
vi.mock("@/lib/crypto", () => ({
  checkBreach: vi.fn().mockResolvedValue(0),
}));

// Dynamic import so the mock is applied before the module loads
const { default: EntryCard } = await import("@/app/(vault)/_components/entry-card");

const NOW = Date.now();
const DAY_MS = 86_400_000;

function makeEntry(overrides: Partial<DecryptedEntry> = {}): DecryptedEntry {
  return {
    id: "entry-1",
    name: "GitHub",
    url: "https://github.com",
    username: "alice",
    email: "alice@example.com",
    password: "super-secret-pw",
    notes: "",
    tags: [],
    updatedAt: new Date(NOW - DAY_MS).toISOString(),
    passwordChangedAt: new Date(NOW - DAY_MS).toISOString(), // 1 day old → not stale
    ...overrides,
  };
}

describe("EntryCard", () => {
  let onEdit: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    onEdit = vi.fn<() => void>();
  });

  it("renders the entry name", () => {
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("shows the domain as a link", () => {
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    expect(screen.getByRole("link", { name: "github.com" })).toBeInTheDocument();
  });

  it("body is collapsed by default", () => {
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    expect(screen.queryByText("Username")).not.toBeInTheDocument();
  });

  it("clicking the card header expands the body", async () => {
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await userEvent.click(screen.getByText("GitHub").closest("div")!);
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("password is masked (••••) by default after expanding", async () => {
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await userEvent.click(screen.getByText("GitHub").closest("div")!);
    expect(screen.getByText("••••••••")).toBeInTheDocument();
    expect(screen.queryByText("super-secret-pw")).not.toBeInTheDocument();
  });

  it("show-password toggle reveals the password", async () => {
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await userEvent.click(screen.getByText("GitHub").closest("div")!);
    await userEvent.click(screen.getByRole("button", { name: /show password/i }));
    expect(screen.getByText("super-secret-pw")).toBeInTheDocument();
  });

  it("Edit button calls onEdit", async () => {
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledOnce();
  });

  it("does NOT show stale badge when password is fresh", () => {
    render(
      <EntryCard
        entry={makeEntry({ passwordChangedAt: new Date(NOW - DAY_MS).toISOString() })}
        onEdit={onEdit}
      />,
    );
    // A 1-day-old password is not stale
    expect(screen.queryByTitle(/days ago/)).not.toBeInTheDocument();
  });

  it("shows stale badge when password is >90 days old", () => {
    const staleDate = new Date(NOW - 100 * DAY_MS).toISOString();
    render(<EntryCard entry={makeEntry({ passwordChangedAt: staleDate })} onEdit={onEdit} />);
    // The badge shows the age in days
    expect(screen.getByTitle(/100 days ago/)).toBeInTheDocument();
  });

  it("renders tags when the entry has them", async () => {
    const entry = makeEntry({
      tags: [
        { id: "t1", name: "work" },
        { id: "t2", name: "code" },
      ],
    });
    render(<EntryCard entry={entry} onEdit={onEdit} />);
    await userEvent.click(screen.getByText("GitHub").closest("div")!);
    expect(screen.getByText("work")).toBeInTheDocument();
    expect(screen.getByText("code")).toBeInTheDocument();
  });

  it("renders notes when present", async () => {
    const entry = makeEntry({ notes: "2FA enabled" });
    render(<EntryCard entry={entry} onEdit={onEdit} />);
    await userEvent.click(screen.getByText("GitHub").closest("div")!);
    expect(screen.getByText("2FA enabled")).toBeInTheDocument();
  });

  it("copy button calls navigator.clipboard.writeText", async () => {
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await userEvent.click(screen.getByText("GitHub").closest("div")!);
    const usernameRow = screen.getByText("Username").closest("div")!;
    const copyBtn = within(usernameRow).getByRole("button", { name: /copy/i });
    await userEvent.click(copyBtn);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("alice");
  });
});
