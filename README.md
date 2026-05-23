# 🧀 Cheesy Toast Vault

A self-hosted personal password book with client-side encryption. Your vault password never leaves your browser — the
server stores only ciphertext.

## How it works

Two separate passwords protect your data:

- **Login password** — authenticates you with the server (bcrypt-hashed, verified by the server)
- **Vault password** — encrypts your vault entries in the browser (PBKDF2 → AES-256-GCM; the server never sees it)

Losing your vault password means losing your data. By design.

## Features

**Vault**

- Multiple named vaults per account, each with its own vault password
- Per-entry fields: site name, URL, username, email, password hint, notes, tags
- Per-entry TOTP codes — store a site's 2FA secret and see the live rotating code inline
- Pin favourite entries to the top regardless of sort order
- Entry history — encrypted snapshots before every save; restore any previous version
- Password generator (random characters or passphrase from wordlist)
- Sort entries by last-updated or password age
- Filter by tag or stale-password flag

**Security**

- [HaveIBeenPwned](https://haveibeenpwned.com) breach check per entry (k-anonymity — your password is never transmitted)
- Password health dashboard — counts of weak, stale, and duplicate passwords across all unlocked vaults
- Auto-lock after configurable idle timeout (1 / 5 / 15 / 30 min, or never)
- Clipboard auto-clear — copied passwords and 2FA codes are wiped after 30 seconds
- Two-factor authentication (TOTP) on login with backup codes

**Account & sessions**

- Session list — see every signed-in device with browser, OS, IP, and sign-in time
- Per-session sign-out from settings, or sign out everywhere
- Login history — last 20 authentication events with IP and method
- Email verification, password reset, email change, account deletion

**Search & organisation**

- Cross-vault search across all unlocked vaults from the vault list page
- Bulk select entries for pin, unpin, or delete operations
- Keyboard shortcuts: `/` focus search, `n` new entry, `?` show shortcut list

**UI**

- Light / dark / system colour scheme
- Responsive layout with mobile menu
- Accessible — WCAG AA contrast, focus indicators, screen-reader labels

## Roadmap

- [ ] Custom entry types — user-defined types with arbitrary field schemas (built-in: login, note, card, identity)
- [ ] Soft delete / trash — 30-day recovery window before permanent deletion
- [ ] Bitwarden import — migrate in from a Bitwarden JSON export

## Self-hosting

Requires Docker and a [Resend](https://resend.com) account (free tier: 3 000 emails/month).

**1. Clone and edit the compose file**

```sh
git clone https://github.com/lance1416/cheesy-toast-vault.git
cd cheesy-toast-vault
```

Open `docker/docker-compose.prod.yml` and replace the placeholder values:

| Variable            | Description                                                                      |
| ------------------- | -------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | Strong random string — update in **both** `DATABASE_URL` and `POSTGRES_PASSWORD` |
| `NEXTAUTH_SECRET`   | `openssl rand -hex 32`                                                           |
| `NEXTAUTH_URL`      | Your public domain, e.g. `https://vault.example.com`                             |
| `RESEND_API_KEY`    | From your [Resend dashboard](https://resend.com)                                 |
| `EMAIL_FROM`        | Verified sender, e.g. `Vault <noreply@example.com>`                              |
| `RESET_BASE_URL`    | Same as `NEXTAUTH_URL`                                                           |

**2. Start**

```sh
docker compose -f docker/docker-compose.prod.yml up -d
```

The container runs database migrations automatically on startup. See [`docs/DEPLOY.md`](docs/DEPLOY.md) for the full
guide including HTTPS setup and backups.

## Development

**Prerequisites:** Docker (for the local DB), Node.js 22, pnpm

```sh
# Start the local PostgreSQL container
docker compose -f docker/docker-compose.yml up -d

# Install dependencies
pnpm install

# Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

**Seed the database with sample data:**

```sh
pnpm db:seed
```

This creates two users with vaults and entries pre-loaded:

| Email               | Login password    | Vault    | Vault password     |
| ------------------- | ----------------- | -------- | ------------------ |
| `dev@example.com`   | `DevPassword123!` | Personal | `PersonalVault1!`  |
|                     |                   | Work     | `WorkVault456!`    |
|                     |                   | Finance  | `FinanceVault789!` |
| `other@example.com` | `OtherPass123!`   | Home     | `HomeVault111!`    |
|                     |                   | Hobbies  | `HobbiesVault222!` |

**Other useful commands:**

```sh
pnpm db:migrate        # create a new migration
pnpm db:reset          # reset DB and re-run migrations
pnpm db:studio         # open Prisma Studio
pnpm test              # unit + component tests
pnpm test:e2e          # end-to-end tests (needs dev server running)
pnpm check             # lint + tsc + knip + tests
```

## Stack

|            |                                 |
| ---------- | ------------------------------- |
| Framework  | Next.js 16 (App Router)         |
| Language   | TypeScript                      |
| Styling    | Tailwind CSS v4                 |
| Auth       | next-auth v4 (credentials)      |
| ORM        | Prisma 7                        |
| Database   | PostgreSQL                      |
| Encryption | Web Crypto API (browser-native) |
| Email      | Resend                          |
| Logging    | pino                            |

## License

MIT
