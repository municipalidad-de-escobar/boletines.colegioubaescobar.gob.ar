# Deployment Setup Guide: boletines.colegioubaescobar.gob.ar

GitHub Actions builds the React SPA and deploys to EC2 Apache on every push to `main`.

This app shares the EC2 instance already running `app.colegioubaescobar.gob.ar`. The `deploy-colegio` user and its SSH key are already in place — only the web root, VirtualHost, and GitHub Secrets need to be created.

---

## Architecture

```
GitHub Repository
    ↓
GitHub Actions (Node 20: npm ci → npm run build)
    ↓  [6 VITE_FIREBASE_* secrets injected at build time]
dist/ bundle with baked-in Firebase credentials
    ↓
rsync to EC2 via SSH (same deploy-colegio user as app.colegioubaescobar.gob.ar)
    ↓
Apache: /var/www/boletines.colegioubaescobar.gob.ar
    ↓
Browser: SPA fallback routing (all paths → index.html → React Router)
```

**Key points:**
- No `.env` file on the server — env vars are baked into the bundle at build time
- No server process to restart — static files served by Apache
- No Node.js or npm required on EC2
- Access control is enforced by Firestore Security Rules and role checks in the `users` collection

---

## Prerequisites

- EC2 instance already running `app.colegioubaescobar.gob.ar` (Apache 2.4+, `deploy-colegio` user exists)
- Firebase project configured (Firestore, Google Auth enabled, security rules deployed)
- GitHub repository with `Actions` enabled
- `sudo` access on EC2

---

## Step 1: EC2 — Create web root

The `deploy-colegio` user already exists. Only the web root directory is new.

Run on EC2 **as root or with sudo**:

```bash
# Create web root with correct ownership
mkdir -p /var/www/boletines.colegioubaescobar.gob.ar
chown deploy-colegio:apache /var/www/boletines.colegioubaescobar.gob.ar

# setgid bit: new files inherit apache group so Apache can always read them
chmod 2775 /var/www/boletines.colegioubaescobar.gob.ar
```

Verify the existing user can write to it:

```bash
sudo -u deploy-colegio touch /var/www/boletines.colegioubaescobar.gob.ar/.test && \
  sudo -u deploy-colegio rm /var/www/boletines.colegioubaescobar.gob.ar/.test && \
  echo "OK"
```

---

## Step 2: SSH key — already configured

The SSH key pair used by `app.colegioubaescobar.gob.ar` is already installed in `/home/deploy-colegio/.ssh/authorized_keys`. No new key is needed.

To confirm it still works, test the connection from your local machine:

```bash
ssh -i ~/.ssh/deploy_colegio deploy-colegio@<EC2-IP> "echo OK"
```

---

## Step 3: Apache VirtualHost

Create `/etc/httpd/conf.d/boletines.colegioubaescobar.gob.ar.conf` on EC2:

```apache
# HTTP → HTTPS redirect
<VirtualHost *:80>
    ServerName boletines.colegioubaescobar.gob.ar
    Redirect permanent / https://boletines.colegioubaescobar.gob.ar/
</VirtualHost>

# HTTPS VirtualHost
<VirtualHost *:443>
    ServerName boletines.colegioubaescobar.gob.ar
    ServerAdmin admin@colegioubaescobar.gob.ar
    DocumentRoot /var/www/boletines.colegioubaescobar.gob.ar

    <Directory /var/www/boletines.colegioubaescobar.gob.ar>
        Options -Indexes
        AllowOverride None
        Require all granted

        # SPA fallback: unknown paths serve index.html so React Router handles them
        FallbackResource /index.html
    </Directory>

    # index.html: never cache (ensures browsers always get the latest app entry point)
    <FilesMatch "^index\.html$">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires "0"
    </FilesMatch>

    # Hashed assets: cache forever (Vite fingerprints filenames — safe to cache permanently)
    <FilesMatch "\.(js|css|woff2?|ttf|otf|eot|png|svg|ico|jpg|jpeg|gif|webp)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>

    # Gzip compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript application/javascript application/json
    </IfModule>

    # Security headers
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "DENY"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"

    # SSL — Certbot will add certificate paths after running certbot --apache
    SSLEngine on
    SSLProtocol -all +TLSv1.2
    SSLCipherSuite HIGH:!aNULL:!MD5
    SSLHonorCipherOrder on

    ErrorLog /var/log/httpd/boletines.colegioubaescobar.gob.ar.error.log
    CustomLog /var/log/httpd/boletines.colegioubaescobar.gob.ar.access.log combined
</VirtualHost>
```

Test and reload:

```bash
sudo httpd -t        # must print "Syntax OK"
sudo systemctl reload httpd
```

---

## Step 4: DNS configuration

Contact the DNS administrator for `escobar.gob.ar` and request an A record pointing to the same EC2 instance:

| Field | Value |
|---|---|
| **Type** | `A` |
| **Name** | `boletines.colegioubaescobar` |
| **Value (IP)** | *(same IP as `app.colegioubaescobar.gob.ar`)* |
| **TTL** | `3600` |

Verify propagation before running Certbot:

```bash
nslookup boletines.colegioubaescobar.gob.ar
# or
dig boletines.colegioubaescobar.gob.ar +short
```

---

## Step 5: HTTPS with Certbot

Certbot is already installed on the instance. Request a certificate for the new subdomain:

```bash
sudo certbot --apache -d boletines.colegioubaescobar.gob.ar
```

Certbot modifies the VirtualHost to add SSL certificate paths and sets up auto-renewal alongside the existing `app.colegioubaescobar.gob.ar` certificate.

Verify:

```bash
curl -I https://boletines.colegioubaescobar.gob.ar
# Returns 404 (no files yet) but HTTPS handshake succeeds
```

---

## Step 6: GitHub Secrets

In the GitHub repository go to **Settings → Secrets and variables → Actions**.

### Reuse from app.colegioubaescobar.gob.ar

These three are identical — if this repo is in the same GitHub org/account, copy the values:

| Secret | Value |
|---|---|
| `SSH_PRIVATE_KEY` | Full contents of `~/.ssh/deploy_colegio` |
| `SERVER_HOST` | EC2 public IP or hostname |
| `DEPLOY_USER` | `deploy-colegio` |

### Firebase credentials

Add the 6 Firebase secrets for this project. If `boletines` shares the same Firebase project as `app.colegioubaescobar.gob.ar`, use the same values:

| Secret | Source |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project settings → Your apps |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console → Project settings |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Console → Project settings |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Console → Project settings |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Console → Project settings |
| `VITE_FIREBASE_APP_ID` | Firebase Console → Project settings → Your apps |

> **Important:** After adding secrets, ensure `https://boletines.colegioubaescobar.gob.ar` is listed under Firebase Console → Authentication → Settings → **Authorized domains**, otherwise Google OAuth will fail.

---

## Step 7: First deployment

**Automatic** — push to `main`:

```bash
git push origin main
```

**Manual** — go to **GitHub → Actions → Build & Deploy → Run workflow → main**.

Each step should show green:
1. Checkout + Node setup
2. Install dependencies (cached by `package-lock.json` hash)
3. Build (injects the 6 Firebase env vars, produces `dist/`)
4. Configure SSH
5. Deploy via rsync (`--delete` removes stale chunks from previous builds)
6. Fix permissions (`755` dirs, `644` files)
7. Health check (3 attempts, 10s apart)
8. Cleanup SSH key (runs even on failure)

---

## Step 8: Verify

```bash
curl -I https://boletines.colegioubaescobar.gob.ar
# → HTTP/2 200

curl -s https://boletines.colegioubaescobar.gob.ar | grep -o '<title>.*</title>'
```

In the browser:
- Login page appears with "Ingresar con cuenta institucional" button
- Google OAuth opens and redirects back to the app
- Only accounts with a document in the Firestore `users` collection (or in `profesoresPendientes`) can sign in

---

## How deploys work (ongoing)

Every push to `main` runs `.github/workflows/deploy.yml`:

1. `npm ci` + `npm run build` — Vite produces `dist/` with code-split chunks (Firebase, PDF, CSV, UI loaded on-demand)
2. `rsync dist/ → EC2:/var/www/boletines.colegioubaescobar.gob.ar/` — incremental, `--delete` removes old chunks
3. Permissions fixed (`755`/`644`) so Apache can read all files
4. Health check curls the live URL 3×

**No downtime:** Apache serves the old `index.html` while rsync runs. The next browser reload gets the updated app.

---

## Troubleshooting

### `Permission denied (publickey)` at SSH step

The `SSH_PRIVATE_KEY` secret doesn't match the key in `/home/deploy-colegio/.ssh/authorized_keys`.

```bash
# On EC2 — verify key is installed:
cat /home/deploy-colegio/.ssh/authorized_keys

# Locally — verify what the secret should contain:
cat ~/.ssh/deploy_colegio   # include BEGIN/END lines
```

### Health check fails but site is live

Apache was slow to start. Re-run the workflow (it's idempotent) or `curl` manually after 30s.

### App loads but Google login fails

1. Verify all 6 `VITE_FIREBASE_*` secrets are set correctly
2. Firebase Console → Authentication → Sign-in method → Google must be enabled
3. `https://boletines.colegioubaescobar.gob.ar` must be listed in Firebase → Authentication → Settings → Authorized domains
4. The signing-in account must exist in the Firestore `users` collection (or `profesoresPendientes`)
5. HTTPS must be active — Google OAuth requires it

### App loads but role is wrong / access denied unexpectedly

The user's document in Firestore `users` collection has an incorrect `role` field. Check and update it directly in the Firebase Console → Firestore.

### Files stuck on old version

Browser cache. Hard-refresh with `Ctrl+Shift+R` or open DevTools → Network → Disable cache → reload.

---

## Maintenance

```bash
# Renew HTTPS certificate manually (auto-renews every 60 days via certbot timer)
sudo certbot renew --force-renewal
sudo systemctl reload httpd

# Apache logs
tail -f /var/log/httpd/boletines.colegioubaescobar.gob.ar.error.log
tail -f /var/log/httpd/boletines.colegioubaescobar.gob.ar.access.log

# Check both apps are running
curl -s -o /dev/null -w "%{http_code}" https://app.colegioubaescobar.gob.ar
curl -s -o /dev/null -w "%{http_code}" https://boletines.colegioubaescobar.gob.ar
```

**Rollback:** `git revert <bad-commit>` and push — GitHub Actions redeploys automatically. `rsync --delete` means old builds aren't kept on the server.

---

## Security notes

- `SSH_PRIVATE_KEY` is shared with `app.colegioubaescobar.gob.ar` — it grants write access only to `/var/www/` directories owned by `deploy-colegio`
- Firebase credentials (`VITE_FIREBASE_*`) are intentionally public (baked into the JS bundle) — security is enforced by Firestore Security Rules and role checks in the `users` collection
- The `deploy-colegio` user has no shell access beyond its home directory and the two web roots
