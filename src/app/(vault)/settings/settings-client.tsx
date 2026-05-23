"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import type { CustomEntryTypeDef } from "@/types/vault";
import CreateCustomTypeModal from "../_components/create-custom-type-modal";
import { useVault } from "@/context/vault";
import AlertBanner from "@/components/alert-banner";
import Field from "@/components/field";
import StrengthBar from "@/components/strength-bar";
import VaultHeader from "../_components/vault-header";
import TotpModal from "./totp-modal";

const TIMEOUTS = [
  { value: 1, label: "1 min" },
  { value: 5, label: "5 min" },
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 0, label: "Never" },
] as const;

type LoginHistoryEntry = {
  id: string;
  ip: string;
  success: boolean;
  method: string;
  createdAt: Date | string;
};

type UserSessionEntry = {
  id: string;
  ip: string;
  userAgent: string;
  createdAt: Date | string;
};

function parseBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  if (ua === "") return "Unknown";
  return "Browser";
}

function parseOS(ua: string): string {
  if (/Windows NT/.test(ua)) return "Windows";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/iPhone|iPad/.test(ua)) return "iOS";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown OS";
}

const METHOD_LABELS: Record<string, string> = {
  password: "Password",
  totp: "Authenticator",
  backup_code: "Backup code",
};

export default function SettingsClient({
  totpEnabled: initialTotpEnabled,
  loginHistory,
  sessions,
  customTypes: initialCustomTypes = [],
}: {
  totpEnabled: boolean;
  loginHistory: LoginHistoryEntry[];
  sessions: UserSessionEntry[];
  customTypes?: CustomEntryTypeDef[];
}) {
  const { lockTimeout, setLockTimeout } = useVault();
  const { data: session } = useSession();

  // Login password
  const [passwordPhase, setPasswordPhase] = useState<"idle" | "form">("idle");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Email change
  const [emailPhase, setEmailPhase] = useState<"idle" | "form">("idle");
  const [emailCurrentPassword, setEmailCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);

  // 2FA
  const [totpEnabled, setTotpEnabled] = useState(initialTotpEnabled);
  const [showTotpModal, setShowTotpModal] = useState(false);
  const [disablePhase, setDisablePhase] = useState<"idle" | "confirm">("idle");
  const [disableCode, setDisableCode] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [disableError, setDisableError] = useState("");

  // Sessions
  const [activeSessions, setActiveSessions] = useState<UserSessionEntry[]>(sessions);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [revokePhase, setRevokePhase] = useState<"idle" | "form">("idle");
  const [revokePassword, setRevokePassword] = useState("");
  const [revoking, setRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState("");

  // Custom types
  const [customTypeList, setCustomTypeList] = useState<CustomEntryTypeDef[]>(initialCustomTypes);
  const [showCreateType, setShowCreateType] = useState(false);
  const [editingType, setEditingType] = useState<CustomEntryTypeDef | undefined>();
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);

  // Delete account
  const [deletePhase, setDeletePhase] = useState<"idle" | "confirm">("idle");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDeleteCustomType(id: string) {
    setDeletingTypeId(id);
    try {
      const res = await fetch(`/api/entry-types/${id}`, { method: "DELETE" });
      if (res.ok) setCustomTypeList((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeletingTypeId(null);
    }
  }

  async function handleRevokeSession(sessionId: string) {
    setRevokingSessionId(sessionId);
    try {
      const res = await fetch(`/api/auth/account/sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok) setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } finally {
      setRevokingSessionId(null);
    }
  }

  async function handleRevokeAllSessions(e: React.FormEvent) {
    e.preventDefault();
    setRevokeError("");
    setRevoking(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revokeAllSessions", currentPassword: revokePassword }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to revoke sessions");
      }
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      setRevokeError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setRevoking(false);
    }
  }

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setDeleteError("");
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to delete account");
      }
      await signOut({ callbackUrl: "/" });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Something went wrong. Please try again.",
      );
      setDeleting(false);
    }
  }

  async function handleDisableTotp(e: React.FormEvent) {
    e.preventDefault();
    setDisableError("");
    setDisabling(true);
    try {
      const res = await fetch("/api/auth/totp", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode.replace(/\s/g, "") }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setDisableError(data.error ?? "Failed to disable 2FA.");
        return;
      }
      setTotpEnabled(false);
      setDisablePhase("idle");
      setDisableCode("");
    } catch {
      setDisableError("Something went wrong. Please try again.");
    } finally {
      setDisabling(false);
    }
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setEmailSubmitting(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "changeEmail",
          currentPassword: emailCurrentPassword,
          newEmail,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to update email");
      }
      setEmailSuccess(true);
      setTimeout(() => signOut({ callbackUrl: "/" }), 1500);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setEmailSubmitting(false);
    }
  }

  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canSubmit =
    currentPassword.length > 0 && newPassword.length >= 12 && newPassword === confirmPassword;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setSuccess(false);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "changePassword", currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to update password");
      }
      setSuccess(true);
      setPasswordPhase("idle");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-canvas min-h-full" style={{ fontFamily: "var(--font-dm-sans, sans-serif)" }}>
      <div className="md:hidden">
        <VaultHeader vaultName="Settings" />
      </div>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="hidden md:block mb-10">
          <h1
            className="text-2xl font-semibold text-default"
            style={{ fontFamily: "var(--font-playfair, serif)" }}
          >
            Settings
          </h1>
          {session?.user?.email && <p className="text-sm text-muted mt-1">{session.user.email}</p>}
        </div>

        {/* ── Security ─────────────────────────────────────────────────────── */}
        <SectionLabel>Security</SectionLabel>
        <div className="rounded-xl bg-surface divide-y divide-line/40 overflow-hidden shadow-[0_2px_12px_rgb(0_0_0/0.07),0_1px_3px_rgb(0_0_0/0.05)] border border-transparent dark:border-line/40 dark:shadow-none">
          {/* Login password */}
          <div>
            <div className="flex items-center gap-3.5 p-4">
              <SettingIcon>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </SettingIcon>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-default">Login password</h2>
                <p className="text-xs text-muted">The password used to sign in to your account.</p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                {success && passwordPhase === "idle" && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400">
                    Updated
                  </span>
                )}
                {passwordPhase === "idle" && (
                  <button
                    type="button"
                    aria-label="Change login password"
                    onClick={() => {
                      setPasswordPhase("form");
                      setSuccess(false);
                    }}
                    className="rounded-lg border border-line px-3.5 py-1.5 text-xs font-semibold text-muted hover:text-default hover:bg-sunken transition-colors"
                  >
                    Change
                  </button>
                )}
              </div>
            </div>
            {passwordPhase === "form" && (
              <div className="px-4 pb-5 border-t border-line/40">
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                  <Field
                    label="Current password"
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    required
                    autoFocus
                  />
                  <div>
                    <Field
                      label="New password"
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={setNewPassword}
                      required
                    />
                    {newPassword && <StrengthBar password={newPassword} />}
                    <p className="mt-1.5 text-xs text-muted">Minimum 12 characters.</p>
                  </div>
                  <div>
                    <Field
                      label="Confirm new password"
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      required
                    />
                    {mismatch && (
                      <p className="mt-1 text-xs text-red-500 dark:text-red-400" role="alert">
                        Passwords do not match.
                      </p>
                    )}
                  </div>
                  {error && <AlertBanner message={error} />}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPasswordPhase("idle");
                        setError("");
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                      className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:bg-sunken transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !canSubmit}
                      className="rounded-lg bg-stone-800 dark:bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Updating…" : "Update password"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Email address */}
          <div>
            <div className="flex items-center gap-3.5 p-4">
              <SettingIcon>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </SettingIcon>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-default">Email address</h2>
                {session?.user?.email && (
                  <p className="text-xs text-muted truncate">{session.user.email}</p>
                )}
              </div>
              {emailPhase === "idle" && !emailSuccess && (
                <button
                  type="button"
                  aria-label="Change email"
                  onClick={() => setEmailPhase("form")}
                  className="shrink-0 rounded-lg border border-line px-3.5 py-1.5 text-xs font-semibold text-muted hover:text-default hover:bg-sunken transition-colors"
                >
                  Change
                </button>
              )}
            </div>
            {(emailPhase !== "idle" || emailSuccess) && (
              <div className="px-4 pb-5 border-t border-line/40">
                {emailSuccess ? (
                  <div
                    role="status"
                    className="rounded-lg border border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-950/20 px-4 py-3 text-sm text-green-700 dark:text-green-400 mt-4"
                  >
                    Verification email sent. Signing you out…
                  </div>
                ) : (
                  <form onSubmit={handleEmailChange} className="space-y-4 pt-4">
                    <Field
                      label="New email"
                      id="new-email"
                      type="email"
                      value={newEmail}
                      onChange={setNewEmail}
                      required
                      autoFocus
                    />
                    <Field
                      label="Current password"
                      id="email-current-password"
                      type="password"
                      value={emailCurrentPassword}
                      onChange={setEmailCurrentPassword}
                      required
                    />
                    {emailError && (
                      <div
                        role="alert"
                        className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-600 dark:text-red-400"
                      >
                        {emailError}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailPhase("idle");
                          setNewEmail("");
                          setEmailCurrentPassword("");
                          setEmailError("");
                        }}
                        className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:bg-sunken transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={emailSubmitting || !newEmail || !emailCurrentPassword}
                        className="rounded-lg bg-stone-800 dark:bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {emailSubmitting ? "Updating…" : "Update email"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Two-factor authentication */}
          <div>
            <div className="flex items-center gap-3.5 p-4">
              <SettingIcon>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </SettingIcon>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-default">Two-factor authentication</h2>
                <p className="text-xs text-muted">
                  Require a code from your authenticator app at sign-in.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${totpEnabled ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-stone-100 dark:bg-stone-800 text-muted"}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${totpEnabled ? "bg-green-500" : "bg-stone-400 dark:bg-stone-500"}`}
                  />
                  {totpEnabled ? "Enabled" : "Disabled"}
                </span>
                {!totpEnabled && disablePhase === "idle" && (
                  <button
                    type="button"
                    onClick={() => setShowTotpModal(true)}
                    className="rounded-lg border border-line px-3.5 py-1.5 text-xs font-semibold text-muted hover:text-default hover:bg-sunken transition-colors"
                  >
                    Set up
                  </button>
                )}
                {totpEnabled && disablePhase === "idle" && (
                  <button
                    type="button"
                    onClick={() => setDisablePhase("confirm")}
                    className="rounded-lg border border-line px-3.5 py-1.5 text-xs font-semibold text-muted hover:text-default hover:bg-sunken transition-colors"
                  >
                    Disable
                  </button>
                )}
              </div>
            </div>
            {totpEnabled && disablePhase === "confirm" && (
              <div className="px-4 pb-5 border-t border-line/40">
                <form onSubmit={handleDisableTotp} className="space-y-4 pt-4">
                  <p className="text-sm text-muted">
                    Enter your current authenticator code to disable 2FA.
                  </p>
                  <div className="space-y-1.5">
                    <label
                      htmlFor="disable-totp-code"
                      className="block text-xs font-medium text-subtle uppercase tracking-wide"
                    >
                      Authenticator code
                    </label>
                    <input
                      id="disable-totp-code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      autoFocus
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="000 000"
                      className="w-full max-w-[10rem] rounded-lg border border-line bg-sunken/50 px-3.5 py-2.5 text-sm text-default placeholder:text-subtle outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:bg-surface text-center tracking-[0.3em] font-mono"
                    />
                  </div>
                  {disableError && <AlertBanner message={disableError} />}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setDisablePhase("idle");
                        setDisableCode("");
                        setDisableError("");
                      }}
                      className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:bg-sunken transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={disabling || disableCode.length !== 6}
                      className="rounded-lg bg-stone-800 dark:bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {disabling ? "Disabling…" : "Confirm disable"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* ── Preferences ──────────────────────────────────────────────────── */}
        <SectionLabel>Preferences</SectionLabel>
        <div className="rounded-xl bg-surface divide-y divide-line/40 overflow-hidden shadow-[0_2px_12px_rgb(0_0_0/0.07),0_1px_3px_rgb(0_0_0/0.05)] border border-transparent dark:border-line/40 dark:shadow-none">
          {/* Auto-lock timeout */}
          <div>
            <div className="flex items-center gap-3.5 p-4">
              <SettingIcon>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </SettingIcon>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-default">Auto-lock timeout</h2>
                <p className="text-xs text-muted">
                  Lock all open vaults after a period of inactivity.
                </p>
              </div>
            </div>
            <div className="px-4 pb-4 pt-3 border-t border-line/40">
              <div role="group" aria-label="Auto-lock timeout" className="flex flex-wrap gap-2">
                {TIMEOUTS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLockTimeout(value)}
                    aria-pressed={lockTimeout === value}
                    className={`rounded-lg px-4 py-2 text-sm font-medium border transition-colors ${
                      lockTimeout === value
                        ? "bg-stone-800 dark:bg-amber-600 text-white border-transparent"
                        : "border-line text-muted hover:border-amber-300 dark:hover:border-amber-700 hover:text-default bg-surface"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Custom entry types */}
          <div>
            <div className="flex items-center gap-3.5 p-4">
              <SettingIcon>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </SettingIcon>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-default">Custom entry types</h2>
                <p className="text-xs text-muted">
                  Define custom schemas for structured vault entries.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingType(undefined);
                  setShowCreateType(true);
                }}
                className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted hover:text-default hover:bg-sunken transition-colors"
              >
                + New type
              </button>
            </div>
            {customTypeList.length === 0 ? (
              <div className="px-4 py-3 border-t border-line/40">
                <p className="text-sm text-subtle">No custom types yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line/40 border-t border-line/40" role="list">
                {customTypeList.map((ct) => (
                  <li key={ct.id} className="px-4 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-default">{ct.name}</p>
                      <p className="text-xs text-muted mt-0.5 truncate">
                        {ct.fields.map((f) => f.label).join(" · ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingType(ct);
                          setShowCreateType(true);
                        }}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:text-default hover:bg-sunken transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={deletingTypeId === ct.id}
                        onClick={() => void handleDeleteCustomType(ct.id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {deletingTypeId === ct.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Activity ─────────────────────────────────────────────────────── */}
        <SectionLabel>Activity</SectionLabel>
        <div className="rounded-xl bg-surface divide-y divide-line/40 overflow-hidden shadow-[0_2px_12px_rgb(0_0_0/0.07),0_1px_3px_rgb(0_0_0/0.05)] border border-transparent dark:border-line/40 dark:shadow-none">
          {/* Active sessions */}
          <div>
            <div className="flex items-center gap-3.5 p-4">
              <SettingIcon>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </SettingIcon>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-default">Active sessions</h2>
                <p className="text-xs text-muted">
                  {activeSessions.length} {activeSessions.length === 1 ? "device" : "devices"}{" "}
                  signed in
                </p>
              </div>
            </div>
            {activeSessions.length === 0 ? (
              <div className="px-4 py-3 border-t border-line/40">
                <p className="text-sm text-subtle">No active sessions recorded.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line/40 border-t border-line/40" role="list">
                {activeSessions.map((s) => {
                  const isCurrent = s.id === session?.user?.sessionId;
                  const browser = parseBrowser(s.userAgent);
                  const os = parseOS(s.userAgent);
                  const date = new Date(s.createdAt);
                  return (
                    <li key={s.id} className="px-4 py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 border border-line/60 flex items-center justify-center shrink-0 text-stone-400">
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <rect x="2" y="3" width="20" height="14" rx="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-default">
                              {browser} on {os}
                            </span>
                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-subtle font-mono">{s.ip}</span>
                            <span className="text-subtle text-xs" aria-hidden="true">
                              ·
                            </span>
                            <time
                              dateTime={date.toISOString()}
                              className="text-xs text-subtle tabular-nums"
                              suppressHydrationWarning
                            >
                              {date.toLocaleDateString("en", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                          </div>
                        </div>
                      </div>
                      {!isCurrent && (
                        <button
                          type="button"
                          disabled={revokingSessionId === s.id}
                          onClick={() => void handleRevokeSession(s.id)}
                          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-muted hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {revokingSessionId === s.id ? "Signing out…" : "Sign out"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="px-4 py-3.5 border-t border-line/40">
              {revokePhase === "idle" ? (
                <button
                  type="button"
                  onClick={() => setRevokePhase("form")}
                  className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:text-default hover:bg-sunken transition-colors"
                >
                  Sign out of all devices
                </button>
              ) : (
                <form onSubmit={handleRevokeAllSessions} className="space-y-4">
                  <p className="text-sm text-muted">
                    Enter your password to sign out of all devices, including this one.
                  </p>
                  <Field
                    label="Current password"
                    id="revoke-password"
                    type="password"
                    value={revokePassword}
                    onChange={setRevokePassword}
                    required
                    autoFocus
                  />
                  {revokeError && <AlertBanner message={revokeError} />}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setRevokePhase("idle");
                        setRevokePassword("");
                        setRevokeError("");
                      }}
                      className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:bg-sunken transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={revoking || !revokePassword}
                      className="rounded-lg bg-stone-800 dark:bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 dark:hover:bg-amber-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {revoking ? "Signing out…" : "Sign out everywhere"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Login history */}
          <div>
            <div className="flex items-center gap-3.5 p-4">
              <SettingIcon>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="12 8 12 12 14 14" />
                  <path d="M3.05 11a9 9 0 1 0 .5-4" />
                  <polyline points="3 3 3 7 7 7" />
                </svg>
              </SettingIcon>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-default">Login history</h2>
                <p className="text-xs text-muted">Your 20 most recent sign-in attempts.</p>
              </div>
            </div>
            {loginHistory.length === 0 ? (
              <div className="px-4 py-3 border-t border-line/40">
                <p className="text-sm text-subtle">No login events recorded yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-line/40 border-t border-line/40" role="list">
                {loginHistory.map((event) => {
                  const date = new Date(event.createdAt);
                  return (
                    <li
                      key={event.id}
                      className="px-4 flex items-center justify-between gap-4 py-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`shrink-0 w-2 h-2 rounded-full ${event.success ? "bg-green-500" : "bg-red-500"}`}
                          aria-label={event.success ? "Success" : "Failed"}
                        />
                        <span className="text-sm text-default font-medium">
                          {event.success ? "Success" : "Failed"}
                        </span>
                        <span className="text-xs text-muted">
                          {METHOD_LABELS[event.method] ?? event.method}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-subtle shrink-0 text-xs tabular-nums">
                        <span className="font-mono hidden sm:inline">{event.ip}</span>
                        <time dateTime={date.toISOString()} suppressHydrationWarning>
                          {date.toLocaleDateString("en", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ── Danger zone ──────────────────────────────────────────────────── */}
        <SectionLabel danger>Danger zone</SectionLabel>
        <div className="rounded-xl bg-surface overflow-hidden mb-10 shadow-[0_2px_12px_rgb(0_0_0/0.07),0_1px_3px_rgb(0_0_0/0.05)] border border-red-200/60 dark:border-red-900/40 dark:shadow-none">
          <div className="flex items-center gap-3.5 p-4">
            <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center shrink-0 text-red-500 dark:text-red-400 [&>svg]:w-4 [&>svg]:h-4">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">
                Delete account
              </h2>
              <p className="text-xs text-muted">
                Permanently erase your account and all vault data. Cannot be undone.
              </p>
            </div>
            {deletePhase === "idle" && (
              <button
                type="button"
                onClick={() => setDeletePhase("confirm")}
                className="shrink-0 rounded-lg border border-red-300 dark:border-red-800 px-3.5 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
          {deletePhase === "confirm" && (
            <div className="px-4 pb-5 border-t border-red-200/70 dark:border-red-900/50">
              <form onSubmit={handleDelete} className="space-y-4 pt-4">
                <p className="text-sm text-muted">
                  Enter your password to confirm. This will permanently delete your account and all
                  vaults.
                </p>
                <Field
                  label="Current password"
                  id="delete-password"
                  type="password"
                  value={deletePassword}
                  onChange={setDeletePassword}
                  required
                  autoFocus
                />
                {deleteError && <AlertBanner message={deleteError} />}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setDeletePhase("idle");
                      setDeletePassword("");
                      setDeleteError("");
                    }}
                    className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-muted hover:bg-sunken transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={deleting || !deletePassword}
                    className="rounded-lg bg-red-600 dark:bg-red-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 dark:hover:bg-red-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Delete permanently"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {showTotpModal && (
        <TotpModal onClose={() => setShowTotpModal(false)} onEnabled={() => setTotpEnabled(true)} />
      )}

      {showCreateType && (
        <CreateCustomTypeModal
          existing={editingType}
          onClose={() => {
            setShowCreateType(false);
            setEditingType(undefined);
          }}
          onSaved={(saved) => {
            setCustomTypeList((prev) =>
              editingType ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved],
            );
            setShowCreateType(false);
            setEditingType(undefined);
          }}
        />
      )}
    </div>
  );
}

function SectionLabel({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <div className="flex items-center gap-3 mt-8 mb-3">
      <span
        className={`text-xs font-semibold uppercase tracking-widest shrink-0 ${danger ? "text-red-500 dark:text-red-400" : "text-subtle"}`}
      >
        {children}
      </span>
      <div
        className={`flex-1 h-px ${danger ? "bg-red-200/50 dark:bg-red-900/30" : "bg-line/40"}`}
      />
    </div>
  );
}

function SettingIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0 text-stone-500 dark:text-stone-400 [&>svg]:w-4 [&>svg]:h-4">
      {children}
    </div>
  );
}
