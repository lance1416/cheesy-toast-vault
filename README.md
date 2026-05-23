# 🧀 Cheesy Toast Vault

[![CI](https://img.shields.io/github/actions/workflow/status/lance1416/cheesy-toast-vault/ci.yml?branch=main&label=CI)](https://github.com/lance1416/cheesy-toast-vault/actions/workflows/ci.yml)
[![Docker](https://img.shields.io/docker/v/lance1416/cheesy-toast-vault?sort=semver&logo=docker&logoColor=white&label=Docker)](https://hub.docker.com/r/lance1416/cheesy-toast-vault)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A self-hosted password manager with **end-to-end client-side encryption**. Your vault password and plaintext secrets
never leave your browser — the server stores only ciphertext.

---

## How it works

Two independent passwords protect your data:

|                    | Purpose                             | Where verified                      |
| ------------------ | ----------------------------------- | ----------------------------------- |
| **Login password** | Authenticates you with the server   | Server (bcrypt)                     |
| **Vault password** | Encrypts and decrypts vault entries | Browser only (PBKDF2 → AES-256-GCM) |

The vault password is never transmitted. Losing it means losing access to your data — by design. See [
`docs/DEPLOY.md`](docs/DEPLOY.md) for a full security overview.

---

## Features

**Entries & organisation**

- Four built-in entry types: login, secure note, payment card, identity
- User-defined custom entry types with arbitrary field schemas
- Per-entry TOTP codes — store a 2FA secret and view the live rotating code inline
- Entry history — encrypted snapshots before every save with one-click restore
- Soft delete / trash — 30-day recovery window with undo toast; no accidental data loss
- Tags, pinned entries, and sort by last-updated or password age

**Security & privacy**

- [HaveIBeenPwned](https://haveibeenpwned.com) breach check — k-anonymity, password never transmitted
- Password health dashboard — weak, stale, and duplicate counts across all unlocked vaults
- Clipboard auto-clear — copied secrets wipe themselves after 30 seconds
- Auto-lock after configurable idle timeout (1 / 5 / 15 / 30 min, or never)
- **Decoy vault** — configure a second password that reveals a separate set of dummy entries; the server stores both
  sets encrypted and cannot distinguish real from decoy
- **Vault access audit log** — every real vault unlock is recorded (IP + timestamp) and displayed in settings; decoy
  unlocks are intentionally excluded to avoid revealing the decoy's existence

**Sharing**

- **Time-limited share links** — generate a read-only URL for any entry; the entry is re-encrypted client-side with a
  fresh key embedded in the URL; the server only stores the SHA-256 hash of the key and the re-encrypted blob and can
  never decrypt it
- Links expire automatically (1 h / 24 h / 7 d / 30 d) and optionally cap view counts
- Revoke any link instantly from the share modal

**Account & sessions**

- Two-factor authentication (TOTP) with backup codes
- Active session list — browser, OS, IP, and sign-in time per device
- Per-session or sign-out-everywhere from settings
- Login history — last 20 sign-in attempts with IP and method
- Email verification, password reset, email change, account deletion

**Search & productivity**

- Cross-vault search across all unlocked vaults
- Bulk select for pin, unpin, or move to trash
- Keyboard shortcuts: `/` search, `n` new entry, `?` shortcut reference

**UI**

- Persistent sidebar navigation with vault list (desktop) and mobile overlay menu
- Light / dark / system colour scheme
- Accessible — WCAG AA contrast, keyboard navigation, screen-reader labels

---

## Self-hosting

Requires Docker and a [Resend](https://resend.com) account (free tier covers 3 000 emails/month).

**1. Clone**

```sh
git clone https://github.com/lance1416/cheesy-toast-vault.git
cd cheesy-toast-vault
```

**2. Configure**

Open `docker/docker-compose.prod.yml` and replace every placeholder value:

| Variable            | Value                                                                         |
| ------------------- | ----------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | Strong random string — set in **both** `DATABASE_URL` and `POSTGRES_PASSWORD` |
| `NEXTAUTH_SECRET`   | `openssl rand -hex 32`                                                        |
| `NEXTAUTH_URL`      | Your public URL, e.g. `https://vault.example.com`                             |
| `RESEND_API_KEY`    | From your [Resend dashboard](https://resend.com)                              |
| `EMAIL_FROM`        | Verified sender, e.g. `Vault <noreply@example.com>`                           |
| `RESET_BASE_URL`    | Same as `NEXTAUTH_URL`                                                        |

**3. Start**

```sh
docker compose -f docker/docker-compose.prod.yml up -d
```

Migrations run automatically on startup. For HTTPS setup, reverse proxy configuration, and backup procedures see [
`docs/DEPLOY.md`](docs/DEPLOY.md).

**Updating**

```sh
docker compose -f docker/docker-compose.prod.yml pull
docker compose -f docker/docker-compose.prod.yml up -d
```

---

## Development

**Prerequisites:** Node.js 22, pnpm, Docker (for the local database)

```sh
# Start the local PostgreSQL container (port 5433)
docker compose -f docker/docker-compose.yml up -d

# Install dependencies and start the dev server
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Seed the database with sample users and vaults:

```sh
pnpm db:seed
```

**Other commands**

```sh
pnpm check          # lint + tsc + knip + unit tests (full local gate)
pnpm test           # unit and component tests (Vitest)
pnpm test:e2e       # end-to-end tests (Playwright)
pnpm db:migrate     # create a new migration
pnpm db:studio      # browse the database in Prisma Studio
```

---

## Stack

|            |                                 |
| ---------- | ------------------------------- |
| Framework  | Next.js 16 (App Router)         |
| Language   | TypeScript                      |
| Styling    | Tailwind CSS v4                 |
| Auth       | next-auth v4                    |
| ORM        | Prisma 7                        |
| Database   | PostgreSQL                      |
| Encryption | Web Crypto API (browser-native) |
| Email      | Resend                          |
| Logging    | pino                            |

---

## License

[MIT](LICENSE)
