# Deploying to Hetzner

Migrates this app from Render to the shared Hetzner box (5.161.104.5),
following the same pattern as FAIS: source + `Dockerfile` +
`docker-compose.prod.yml` live in this repo, the nginx vhost lives in the
`hetzner-infra` repo. See `hetzner-infra/hetzner.md` for the full server
diagram and `hetzner-infra/nginx/quizmaster.alphatronex.com.conf` for the
vhost.

Target: `quizmaster.alphatronex.com` → `127.0.0.1:8020` (host-only) →
`quizmaster-app` container → `quizmaster-mongo` container (internal only).

## 0. Check headroom before starting

This box has 2GB total RAM and is already tight — FAIS alone (app + mongo)
uses ~1.2GB. Adding quizmaster-app (256m) + quizmaster-mongo (400m) pushes
committed memory close to the ceiling.

```bash
free -h
docker stats --no-stream
df -h
```

If the box is already swapping, or existing containers are near their
`mem_limit`, rescale to 4GB first (console.hetzner.cloud → server →
Rescale) before bringing up new containers.

## 1. DNS

Add an A record: `quizmaster.alphatronex.com` → `5.161.104.5`, on whatever
DNS provider hosts `alphatronex.com` (same provider the other
`*.alphatronex.com` subdomains already use). Confirm it resolves before
running Certbot later:

```bash
dig +short quizmaster.alphatronex.com
```

## 2. Push the deploy files

Commit and push `Dockerfile`, `.dockerignore`, `docker-compose.prod.yml`,
the updated `.gitignore`, and `server/.env.production.example` to the
`quizzes` repo (all already created locally).

## 3. Get the code onto the server

```bash
ssh hetzner
sudo mkdir -p /opt/quizmaster
sudo chown $USER:$USER /opt/quizmaster
git clone <quizzes-repo-url> /opt/quizmaster/quizzes
cd /opt/quizmaster/quizzes
```

(If the repo is private, use the same auth method already set up for the
other repos deployed on this box.)

## 4. Create the real secrets file

```bash
cp server/.env.production.example server/.env.production
openssl rand -base64 48   # paste the output as JWT_SECRET below
nano server/.env.production
chmod 600 server/.env.production
```

`MONGODB_URI`, `PORT`, and `NODE_ENV` are already set in
`docker-compose.prod.yml` — only `JWT_SECRET` needs to go in this file.

## 5. Build and start

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
docker logs quizmaster-app --tail 50
curl -i http://127.0.0.1:8020/
```

Expect a 200 with the Angular `index.html` back from the curl.

## 6. Wire up nginx

```bash
# on the server, from the hetzner-infra repo checkout
cp nginx/quizmaster.alphatronex.com.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/quizmaster.alphatronex.com.conf \
  /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

(Confirm the actual sites-available/sites-enabled convention matches what
the other vhosts on this box use — check `ls /etc/nginx/sites-enabled/`
first if unsure.)

## 7. TLS via Certbot

```bash
sudo certbot --nginx -d quizmaster.alphatronex.com
```

Certbot rewrites the vhost file in place to add the HTTPS server block and
HTTP→HTTPS redirect — same as every other vhost in `hetzner-infra/nginx/`.
Copy the resulting file back into the `hetzner-infra` repo afterward so the
repo matches what's actually live (matches the existing convention there).

## 8. Verify

- `https://quizmaster.alphatronex.com` loads the app.
- Register a test account, log in, take a quiz, confirm it appears in
  history.
- `docker logs quizmaster-app` and `docker logs quizmaster-mongo` show no
  errors.
- `docker stats --no-stream` — confirm both containers are well under
  their `mem_limit`, and the box overall isn't swapping.

## 9. After go-live

- Decide whether to decommission the Render service (`render.yaml` in this
  repo) or leave it as a fallback for a few days before deleting it.
- Update `hetzner-infra/hetzner.md`'s Quiz Master section with the actual
  cert expiry date Certbot reports.
