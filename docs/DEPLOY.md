# Deployment Guide

Self-hosted deployment using Docker Compose on a Linux VPS.

## Prerequisites

- VPS with 1 GB RAM minimum (512 MB bare minimum, 1 GB recommended)
- Docker Engine 24+ and Docker Compose v2
- A domain name with DNS pointing to your server
- A [Resend](https://resend.com) account (free tier: 3 000 emails/month)

## 1. Clone the repository

```sh
git clone <your-repo-url> cheesy-toast-vault
cd cheesy-toast-vault
```

## 2. Configure the compose file

Edit `docker/docker-compose.prod.yml` and replace the placeholder values:

| Variable            | How to set                                                                              |
| ------------------- | --------------------------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | Any strong random string — update it in **both** `DATABASE_URL` and `POSTGRES_PASSWORD` |
| `NEXTAUTH_SECRET`   | `openssl rand -hex 32`                                                                  |
| `NEXTAUTH_URL`      | `https://yourdomain.com`                                                                |
| `RESEND_API_KEY`    | From your Resend dashboard                                                              |
| `EMAIL_FROM`        | `Your App <noreply@yourdomain.com>` — must be a verified Resend sender domain           |
| `RESET_BASE_URL`    | Same as `NEXTAUTH_URL`                                                                  |

## 3. Start the stack

```sh
docker compose -f docker/docker-compose.prod.yml up -d
```

Docker pulls the pre-built image from Docker Hub. The app container runs database migrations automatically on every
start before launching the server.

## 4. Set up HTTPS with Nginx (recommended)

Install Certbot and obtain a certificate, then create `/etc/nginx/sites-available/vault`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

```sh
ln -s /etc/nginx/sites-available/vault /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

> **Important:** `X-Forwarded-For` must be set for rate limiting to work correctly.

## 5. Verify

- Open `https://yourdomain.com` — you should see the login page
- Register an account — you should receive a verification email
- Verify → sign in → create a vault entry

## Updating

```sh
docker compose -f docker/docker-compose.prod.yml pull
docker compose -f docker/docker-compose.prod.yml up -d
```

Migrations run automatically on restart.

## Database backup

```sh
# Backup
docker exec $(docker compose -f docker/docker-compose.prod.yml ps -q db) \
  pg_dump -U postgres cheesy_toast_vault > backup-$(date +%Y%m%d).sql

# Restore
docker exec -i $(docker compose -f docker/docker-compose.prod.yml ps -q db) \
  psql -U postgres cheesy_toast_vault < backup-20260101.sql
```

## Logs

```sh
docker compose -f docker/docker-compose.prod.yml logs -f app
docker compose -f docker/docker-compose.prod.yml logs -f db
```
