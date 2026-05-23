import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/crypto", () => ({
  encryptEntry: vi.fn().mockResolvedValue({ encryptedBlob: "blob", iv: "iv" }),
}));

// PasswordGenerator imports a large wordlist; mock it out entirely.
vi.mock("@/app/(vault)/_components/password-generator", () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="password-generator">
      <button type="button" onClick={onClose}>
        Close generator
      </button>
    </div>
  ),
}));

// TagSelector makes a fetch call when creating tags; provide a minimal stub.
vi.mock("@/app/(vault)/_components/tag-selector", () => ({
  default: () => null,
}));

const { default: NewEntryModal } = await import("@/app/(vault)/_components/new-entry-modal");

const BASE_PROPS = {
  vaultId: "vault-1",
  cryptoKey: {} as CryptoKey,
  tags: [],
  onTagCreated: vi.fn(),
  onClose: vi.fn(),
  onSuccess: vi.fn(),
};

function setup() {
  const user = userEvent.setup();
  render(<NewEntryModal {...BASE_PROPS} />);
  return { user };
}

// Locate the type-picker group and the buttons inside it.
function typePicker() {
  return screen.getByRole("group", { name: /entry type/i });
}

describe("NewEntryModal — type picker", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: "new-entry-id" }),
      }),
    );
    BASE_PROPS.onSuccess.mockReset();
    BASE_PROPS.onClose.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Type buttons ─────────────────────────────────────────────────────────────

  it("renders all four type buttons", () => {
    setup();
    const group = typePicker();
    expect(within(group).getByRole("button", { name: "Login" })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "Note" })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "Card" })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "Identity" })).toBeInTheDocument();
  });

  it("Login is selected by default (aria-pressed=true)", () => {
    setup();
    const loginBtn = within(typePicker()).getByRole("button", { name: "Login" });
    expect(loginBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("pressing a type button marks it as selected and deselects Login", async () => {
    const { user } = setup();
    const group = typePicker();
    await user.click(within(group).getByRole("button", { name: "Note" }));
    expect(within(group).getByRole("button", { name: "Note" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(group).getByRole("button", { name: "Login" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  // ── Modal title ───────────────────────────────────────────────────────────────

  it("title says 'New Login' by default", () => {
    setup();
    expect(screen.getByRole("heading", { name: "New Login" })).toBeInTheDocument();
  });

  it("title updates when type is changed", async () => {
    const { user } = setup();
    await user.click(within(typePicker()).getByRole("button", { name: "Note" }));
    expect(screen.getByRole("heading", { name: "New Note" })).toBeInTheDocument();
    await user.click(within(typePicker()).getByRole("button", { name: "Card" }));
    expect(screen.getByRole("heading", { name: "New Card" })).toBeInTheDocument();
    await user.click(within(typePicker()).getByRole("button", { name: "Identity" }));
    expect(screen.getByRole("heading", { name: "New Identity" })).toBeInTheDocument();
  });

  // ── Login fields ──────────────────────────────────────────────────────────────

  it("Login shows URL, Username, Email, Password, Notes, 2FA fields", () => {
    setup();
    expect(document.getElementById("new-url")).toBeInTheDocument();
    expect(document.getElementById("new-username")).toBeInTheDocument();
    expect(document.getElementById("new-email")).toBeInTheDocument();
    expect(document.getElementById("new-password")).toBeInTheDocument();
    expect(document.getElementById("new-notes")).toBeInTheDocument();
    expect(document.getElementById("new-totp")).toBeInTheDocument();
  });

  // ── Note fields ───────────────────────────────────────────────────────────────

  it("Note hides login-specific fields and shows Content textarea", async () => {
    const { user } = setup();
    await user.click(within(typePicker()).getByRole("button", { name: "Note" }));

    expect(document.getElementById("new-url")).not.toBeInTheDocument();
    expect(document.getElementById("new-username")).not.toBeInTheDocument();
    expect(document.getElementById("new-password")).not.toBeInTheDocument();
    expect(document.getElementById("new-body")).toBeInTheDocument();
  });

  // ── Card fields ───────────────────────────────────────────────────────────────

  it("Card shows cardholder, number, expiry, CVV, PIN fields", async () => {
    const { user } = setup();
    await user.click(within(typePicker()).getByRole("button", { name: "Card" }));

    expect(document.getElementById("new-cardholder")).toBeInTheDocument();
    expect(document.getElementById("new-cardnumber")).toBeInTheDocument();
    expect(document.getElementById("new-expiry")).toBeInTheDocument();
    expect(document.getElementById("new-cvv")).toBeInTheDocument();
    expect(document.getElementById("new-pin")).toBeInTheDocument();
    expect(document.getElementById("new-username")).not.toBeInTheDocument();
  });

  // ── Identity fields ───────────────────────────────────────────────────────────

  it("Identity shows full name, phone, address, ID number fields", async () => {
    const { user } = setup();
    await user.click(within(typePicker()).getByRole("button", { name: "Identity" }));

    expect(document.getElementById("new-fullname")).toBeInTheDocument();
    expect(document.getElementById("new-phone")).toBeInTheDocument();
    expect(document.getElementById("new-address")).toBeInTheDocument();
    expect(document.getElementById("new-idnumber")).toBeInTheDocument();
    expect(document.getElementById("new-password")).not.toBeInTheDocument();
  });

  // ── Submit sends correct entryType ────────────────────────────────────────────

  it("submitting as Note sends entryType=note in the request body", async () => {
    const { user } = setup();
    await user.click(within(typePicker()).getByRole("button", { name: "Note" }));
    await user.type(document.getElementById("new-name")!, "My Note");
    await user.type(document.getElementById("new-body")!, "Note content");
    await user.click(screen.getByRole("button", { name: /save entry/i }));

    await waitFor(() => expect(BASE_PROPS.onSuccess).toHaveBeenCalledOnce());

    const [, options] = vi.mocked(fetch as typeof globalThis.fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string) as Record<string, unknown>;
    expect(body.entryType).toBe("note");
  });

  it("submitting as Card sends entryType=card in the request body", async () => {
    const { user } = setup();
    await user.click(within(typePicker()).getByRole("button", { name: "Card" }));
    await user.type(document.getElementById("new-name")!, "My Card");
    await user.click(screen.getByRole("button", { name: /save entry/i }));

    await waitFor(() => expect(BASE_PROPS.onSuccess).toHaveBeenCalledOnce());

    const [, options] = vi.mocked(fetch as typeof globalThis.fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string) as Record<string, unknown>;
    expect(body.entryType).toBe("card");
  });

  it("submitting as Login sends entryType=login in the request body", async () => {
    const { user } = setup();
    await user.type(document.getElementById("new-name")!, "GitHub");
    await user.click(screen.getByRole("button", { name: /save entry/i }));

    await waitFor(() => expect(BASE_PROPS.onSuccess).toHaveBeenCalledOnce());

    const [, options] = vi.mocked(fetch as typeof globalThis.fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string) as Record<string, unknown>;
    expect(body.entryType).toBe("login");
  });

  // ── Custom types ──────────────────────────────────────────────────────────────

  const CUSTOM_TYPES = [
    {
      id: "ct-server",
      name: "Server",
      fields: [
        { id: "f-host", label: "Host", kind: "text" as const },
        { id: "f-key", label: "API Key", kind: "secret" as const },
      ],
    },
  ];

  it("renders custom type pill buttons when customTypes are provided", () => {
    render(<NewEntryModal {...BASE_PROPS} customTypes={CUSTOM_TYPES} />);
    const group = screen.getByRole("group", { name: /custom entry types/i });
    expect(within(group).getByRole("button", { name: "Server" })).toBeInTheDocument();
  });

  it("does not render the custom types section when customTypes is empty", () => {
    setup(); // no customTypes prop → default []
    expect(screen.queryByRole("group", { name: /custom entry types/i })).not.toBeInTheDocument();
  });

  it("selecting a custom type shows its fields by id", async () => {
    const user = userEvent.setup();
    render(<NewEntryModal {...BASE_PROPS} customTypes={CUSTOM_TYPES} />);
    await user.click(
      within(screen.getByRole("group", { name: /custom entry types/i })).getByRole("button", {
        name: "Server",
      }),
    );
    expect(document.getElementById("new-custom-f-host")).toBeInTheDocument();
    expect(document.getElementById("new-custom-f-key")).toBeInTheDocument();
  });

  it("selecting a custom type hides built-in login fields", async () => {
    const user = userEvent.setup();
    render(<NewEntryModal {...BASE_PROPS} customTypes={CUSTOM_TYPES} />);
    await user.click(
      within(screen.getByRole("group", { name: /custom entry types/i })).getByRole("button", {
        name: "Server",
      }),
    );
    expect(document.getElementById("new-username")).not.toBeInTheDocument();
    expect(document.getElementById("new-password")).not.toBeInTheDocument();
  });

  it("modal title shows custom type name", async () => {
    const user = userEvent.setup();
    render(<NewEntryModal {...BASE_PROPS} customTypes={CUSTOM_TYPES} />);
    await user.click(
      within(screen.getByRole("group", { name: /custom entry types/i })).getByRole("button", {
        name: "Server",
      }),
    );
    expect(screen.getByRole("heading", { name: "New Server" })).toBeInTheDocument();
  });

  it("submitting with a custom type sends its ID as entryType", async () => {
    const user = userEvent.setup();
    render(<NewEntryModal {...BASE_PROPS} customTypes={CUSTOM_TYPES} />);
    await user.click(
      within(screen.getByRole("group", { name: /custom entry types/i })).getByRole("button", {
        name: "Server",
      }),
    );
    await user.type(document.getElementById("new-name")!, "Prod box");
    await user.click(screen.getByRole("button", { name: /save entry/i }));

    await waitFor(() => expect(BASE_PROPS.onSuccess).toHaveBeenCalledOnce());

    const calls = vi.mocked(fetch as typeof globalThis.fetch).mock.calls;
    const [, options] = calls[calls.length - 1];
    const body = JSON.parse((options as RequestInit).body as string) as Record<string, unknown>;
    expect(body.entryType).toBe("ct-server");
  });
});
