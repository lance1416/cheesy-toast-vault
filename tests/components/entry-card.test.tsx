import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DecryptedEntry } from "@/types/vault";

// checkBreach is mocked to avoid real network calls; tests that need specific
// return values override it per-test with mockResolvedValueOnce.
vi.mock("@/lib/crypto", () => ({
  checkBreach: vi.fn().mockResolvedValue(0),
}));

// otplib is mocked so TotpRow renders a deterministic code without real TOTP.
vi.mock("otplib", () => ({
  generate: vi.fn().mockResolvedValue("123456"),
}));

// Dynamic import so both mocks are applied before the module graph loads.
const { default: EntryCard } = await import("@/app/(vault)/_components/entry-card");
const { checkBreach } = await import("@/lib/crypto");

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
    pinned: false,
    tags: [],
    updatedAt: new Date(NOW - DAY_MS).toISOString(),
    passwordChangedAt: new Date(NOW - DAY_MS).toISOString(), // 1 day old → not stale
    ...overrides,
  };
}

// ─── Expand helper ─────────────────────────────────────────────────────────

async function expand(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("GitHub").closest("div")!);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("EntryCard", () => {
  let onEdit: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    onEdit = vi.fn<() => void>();
    vi.mocked(checkBreach).mockResolvedValue(0);
  });

  // ── Collapsed state ─────────────────────────────────────────────────────────

  it("renders the entry name", () => {
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("shows the domain as a link when url is present", () => {
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    expect(screen.getByRole("link", { name: "github.com" })).toBeInTheDocument();
  });

  it("shows no domain link when url is absent", () => {
    render(<EntryCard entry={makeEntry({ url: undefined })} onEdit={onEdit} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders vault name badge when vaultName prop is provided", () => {
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} vaultName="Personal" />);
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });

  it("body is collapsed by default", () => {
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    expect(screen.queryByText("Username")).not.toBeInTheDocument();
  });

  it("Edit button calls onEdit without expanding the card", async () => {
    const user = userEvent.setup();
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.queryByText("Username")).not.toBeInTheDocument();
  });

  it("does NOT show stale badge when password is fresh", () => {
    render(
      <EntryCard
        entry={makeEntry({ passwordChangedAt: new Date(NOW - DAY_MS).toISOString() })}
        onEdit={onEdit}
      />,
    );
    expect(screen.queryByTitle(/days ago/)).not.toBeInTheDocument();
  });

  it("shows stale badge when password is >90 days old", () => {
    const staleDate = new Date(NOW - 100 * DAY_MS).toISOString();
    render(<EntryCard entry={makeEntry({ passwordChangedAt: staleDate })} onEdit={onEdit} />);
    expect(screen.getByTitle(/\d+ days ago/)).toBeInTheDocument();
  });

  // ── Expanded state ──────────────────────────────────────────────────────────

  it("clicking the card header expands the body", async () => {
    const user = userEvent.setup();
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await expand(user);
    expect(screen.getByText("Username")).toBeInTheDocument();
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("password is masked (••••) by default after expanding", async () => {
    const user = userEvent.setup();
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await expand(user);
    expect(screen.getByText("••••••••")).toBeInTheDocument();
    expect(screen.queryByText("super-secret-pw")).not.toBeInTheDocument();
  });

  it("show-password toggle reveals the password", async () => {
    const user = userEvent.setup();
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await expand(user);
    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(screen.getByText("super-secret-pw")).toBeInTheDocument();
  });

  it("renders tags when the entry has them", async () => {
    const user = userEvent.setup();
    const entry = makeEntry({
      tags: [
        { id: "t1", name: "work" },
        { id: "t2", name: "code" },
      ],
    });
    render(<EntryCard entry={entry} onEdit={onEdit} />);
    await expand(user);
    expect(screen.getByText("work")).toBeInTheDocument();
    expect(screen.getByText("code")).toBeInTheDocument();
  });

  it("renders notes when present", async () => {
    const user = userEvent.setup();
    const entry = makeEntry({ notes: "2FA enabled" });
    render(<EntryCard entry={entry} onEdit={onEdit} />);
    await expand(user);
    expect(screen.getByText("2FA enabled")).toBeInTheDocument();
  });

  it("copy button calls navigator.clipboard.writeText with the correct value", async () => {
    // Spy directly so userEvent.setup()'s clipboard replacement doesn't interfere.
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    const user = userEvent.setup();
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await expand(user);
    const usernameRow = screen.getByText("Username").closest("div")!;
    await user.click(within(usernameRow).getByRole("button", { name: /copy/i }));
    expect(writeText).toHaveBeenCalledWith("alice");
    writeText.mockRestore();
  });

  // ── History button ──────────────────────────────────────────────────────────

  it("shows History button when onHistory prop is provided", async () => {
    const user = userEvent.setup();
    const onHistory = vi.fn<() => void>();
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} onHistory={onHistory} />);
    await expand(user);
    expect(screen.getByRole("button", { name: "History" })).toBeInTheDocument();
  });

  it("History button calls onHistory", async () => {
    const user = userEvent.setup();
    const onHistory = vi.fn<() => void>();
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} onHistory={onHistory} />);
    await expand(user);
    await user.click(screen.getByRole("button", { name: "History" }));
    expect(onHistory).toHaveBeenCalledOnce();
  });

  it("does not show History button when onHistory is absent", async () => {
    const user = userEvent.setup();
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await expand(user);
    expect(screen.queryByRole("button", { name: "History" })).not.toBeInTheDocument();
  });

  // ── TOTP row ────────────────────────────────────────────────────────────────

  it("shows 2FA Code row when totpSecret is set", async () => {
    const user = userEvent.setup();
    render(<EntryCard entry={makeEntry({ totpSecret: "JBSWY3DPEHPK3PXP" })} onEdit={onEdit} />);
    await expand(user);
    expect(await screen.findByText("2FA Code")).toBeInTheDocument();
    expect(await screen.findByText("123456")).toBeInTheDocument();
  });

  it("does not show 2FA Code row when totpSecret is absent", async () => {
    const user = userEvent.setup();
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await expand(user);
    expect(screen.queryByText("2FA Code")).not.toBeInTheDocument();
  });

  // ── Breach check ────────────────────────────────────────────────────────────

  it("breach check: shows Safe when password is not in any breach", async () => {
    const user = userEvent.setup();
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await expand(user);
    await user.click(screen.getByRole("button", { name: /check for breaches/i }));
    expect(await screen.findByText("Safe")).toBeInTheDocument();
  });

  it("breach check: shows Seen N× when password appears in a breach", async () => {
    vi.mocked(checkBreach).mockResolvedValueOnce(42);
    const user = userEvent.setup();
    render(<EntryCard entry={makeEntry()} onEdit={onEdit} />);
    await expand(user);
    await user.click(screen.getByRole("button", { name: /check for breaches/i }));
    expect(await screen.findByText(/seen 42/i)).toBeInTheDocument();
  });
});
