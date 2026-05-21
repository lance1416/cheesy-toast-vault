import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/logger", () => ({ default: { error: vi.fn() } }));

import logger from "@/server/logger";
import { handleApiError } from "@/server/api-error";

beforeEach(() => {
  vi.clearAllMocks();
});

function prismaError(code: string): Error {
  const err = new Error("prisma error") as Error & { code: string };
  err.code = code;
  return err;
}

describe("handleApiError", () => {
  it("P2025 (record not found) → 404", async () => {
    const res = handleApiError(prismaError("P2025"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("P2002 (unique constraint) → 409", async () => {
    const res = handleApiError(prismaError("P2002"));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Already exists" });
  });

  it("unknown Prisma code → 500", async () => {
    const res = handleApiError(prismaError("P9999"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal server error" });
  });

  it("plain Error (no code) → 500", async () => {
    const res = handleApiError(new Error("something broke"));
    expect(res.status).toBe(500);
  });

  it("non-Error value → 500", async () => {
    const res = handleApiError("string error");
    expect(res.status).toBe(500);
  });

  it("logs the error via logger.error", () => {
    const err = new Error("oops");
    handleApiError(err);
    expect(logger.error).toHaveBeenCalledWith({ err }, "unhandled API error");
  });
});
