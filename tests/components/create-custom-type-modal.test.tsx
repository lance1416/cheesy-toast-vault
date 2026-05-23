import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CustomEntryTypeDef } from "@/types/vault";

const SAVED_TYPE: CustomEntryTypeDef = {
  id: "ct-1",
  name: "Server",
  fields: [{ id: "f-1", label: "Host", kind: "text" }],
};

const { default: CreateCustomTypeModal } =
  await import("@/app/(vault)/_components/create-custom-type-modal");

const BASE_PROPS = {
  onClose: vi.fn(),
  onSaved: vi.fn(),
};

describe("CreateCustomTypeModal", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(SAVED_TYPE),
      }),
    );
    BASE_PROPS.onSaved.mockReset();
    BASE_PROPS.onClose.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── Initial render ────────────────────────────────────────────────────────────

  it("renders type name field and one default field row", () => {
    render(<CreateCustomTypeModal {...BASE_PROPS} />);
    expect(document.getElementById("ct-name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Field 1 label")).toBeInTheDocument();
  });

  it("shows 'Create type' as the submit label when creating", () => {
    render(<CreateCustomTypeModal {...BASE_PROPS} />);
    expect(screen.getByRole("button", { name: /create type/i })).toBeInTheDocument();
  });

  it("shows 'Save changes' and pre-fills form when editing", () => {
    const existing: CustomEntryTypeDef = {
      id: "ct-existing",
      name: "Old Name",
      fields: [{ id: "f-x", label: "Key", kind: "text" }],
    };
    render(<CreateCustomTypeModal existing={existing} {...BASE_PROPS} />);
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect((document.getElementById("ct-name") as HTMLInputElement).value).toBe("Old Name");
    expect((screen.getByPlaceholderText("Field 1 label") as HTMLInputElement).value).toBe("Key");
  });

  // ── Field management ──────────────────────────────────────────────────────────

  it("'+ Add field' appends a new row", async () => {
    const user = userEvent.setup();
    render(<CreateCustomTypeModal {...BASE_PROPS} />);
    await user.click(screen.getByRole("button", { name: /\+ add field/i }));
    expect(screen.getByPlaceholderText("Field 2 label")).toBeInTheDocument();
  });

  it("remove button is disabled while only one field exists", () => {
    render(<CreateCustomTypeModal {...BASE_PROPS} />);
    expect(screen.getByRole("button", { name: /remove field/i })).toBeDisabled();
  });

  it("remove button deletes a field row when multiple exist", async () => {
    const user = userEvent.setup();
    render(<CreateCustomTypeModal {...BASE_PROPS} />);
    await user.click(screen.getByRole("button", { name: /\+ add field/i }));
    const removeButtons = screen.getAllByRole("button", { name: /remove field/i });
    expect(removeButtons).toHaveLength(2);
    await user.click(removeButtons[0]);
    expect(screen.getAllByRole("button", { name: /remove field/i })).toHaveLength(1);
  });

  // ── Validation ────────────────────────────────────────────────────────────────

  it("shows error and does not call API when name is blank (whitespace only)", async () => {
    const user = userEvent.setup();
    render(<CreateCustomTypeModal {...BASE_PROPS} />);
    // Use whitespace so the `required` HTML attribute is satisfied,
    // but our own trim-check still rejects it.
    await user.type(document.getElementById("ct-name")!, "   ");
    await user.click(screen.getByRole("button", { name: /create type/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/type name is required/i);
    expect(vi.mocked(fetch as typeof globalThis.fetch)).not.toHaveBeenCalled();
    expect(BASE_PROPS.onSaved).not.toHaveBeenCalled();
  });

  it("shows error when no fields have labels filled in", async () => {
    const user = userEvent.setup();
    render(<CreateCustomTypeModal {...BASE_PROPS} />);
    fireEvent.change(document.getElementById("ct-name")!, { target: { value: "My Type" } });
    // Field label is empty by default — our validation rejects it
    await user.click(screen.getByRole("button", { name: /create type/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/at least one field/i);
  });

  // ── Successful submit ─────────────────────────────────────────────────────────

  it("POSTs to /api/entry-types and calls onSaved on success", async () => {
    const user = userEvent.setup();
    render(<CreateCustomTypeModal {...BASE_PROPS} />);
    // fireEvent.change sets values directly — avoids the Modal's RAF focus-trap
    // stealing focus from the input between typed characters.
    fireEvent.change(document.getElementById("ct-name")!, { target: { value: "Server" } });
    fireEvent.change(screen.getByPlaceholderText("Field 1 label"), { target: { value: "Host" } });
    await user.click(screen.getByRole("button", { name: /create type/i }));

    await waitFor(() => expect(BASE_PROPS.onSaved).toHaveBeenCalledOnce());

    const [url, options] = vi.mocked(fetch as typeof globalThis.fetch).mock.calls[0];
    expect(url).toBe("/api/entry-types");
    expect((options as RequestInit).method).toBe("POST");
    const body = JSON.parse((options as RequestInit).body as string) as Record<string, unknown>;
    expect(body.name).toBe("Server");
    expect((body.fields as { label: string }[])[0].label).toBe("Host");
  });

  it("PUTs to /api/entry-types/:id when editing an existing type", async () => {
    const user = userEvent.setup();
    const existing: CustomEntryTypeDef = {
      id: "ct-edit",
      name: "Old",
      fields: [{ id: "f-1", label: "Key", kind: "text" }],
    };
    render(<CreateCustomTypeModal existing={existing} {...BASE_PROPS} />);

    fireEvent.change(document.getElementById("ct-name")!, { target: { value: "New Name" } });
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(BASE_PROPS.onSaved).toHaveBeenCalledOnce());

    const [url, options] = vi.mocked(fetch as typeof globalThis.fetch).mock.calls[0];
    expect(url).toBe("/api/entry-types/ct-edit");
    expect((options as RequestInit).method).toBe("PUT");
  });

  it("does not submit fields with empty labels", async () => {
    const user = userEvent.setup();
    render(<CreateCustomTypeModal {...BASE_PROPS} />);
    fireEvent.change(document.getElementById("ct-name")!, { target: { value: "My Type" } });
    await user.click(screen.getByRole("button", { name: /\+ add field/i })); // row 2 empty
    fireEvent.change(screen.getByPlaceholderText("Field 1 label"), { target: { value: "Filled" } });
    // Field 2 label stays empty
    await user.click(screen.getByRole("button", { name: /create type/i }));

    await waitFor(() => expect(BASE_PROPS.onSaved).toHaveBeenCalledOnce());

    const [, options] = vi.mocked(fetch as typeof globalThis.fetch).mock.calls[0];
    const body = JSON.parse((options as RequestInit).body as string) as {
      fields: { label: string }[];
    };
    expect(body.fields).toHaveLength(1); // only the filled field is sent
    expect(body.fields[0].label).toBe("Filled");
  });

  it("calls onClose when Cancel is clicked", async () => {
    const user = userEvent.setup();
    render(<CreateCustomTypeModal {...BASE_PROPS} />);
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(BASE_PROPS.onClose).toHaveBeenCalledOnce();
  });
});
