# Deploying Yes Boss backend to AWS (free tier)

Target: **one `t3.micro` EC2** (12-mo free) running Postgres + the backend in
Docker, **S3** for recordings (5 GB free), **Groq** for recap (free). Mobile app
talks to it over **HTTPS**.

```
 Android app  ──HTTPS──>  Caddy (TLS)  ──>  backend :4000  ──>  Postgres (container)
                                                  │
                                                  ├──>  S3  (recordings)
                                                  └──>  Groq (transcribe + summarize)
```

After 12 months: flip S3 → Backblaze B2 (10 GB free forever, S3-compatible) by
editing storage env only — no code change.

---

## 0. Prerequisites
- AWS account.
- A domain or free subdomain for HTTPS. Easiest free option: **DuckDNS**
  (`yourname.duckdns.org`). Android blocks plain-HTTP to non-local hosts, so TLS
  is required.

## 1. S3 bucket + IAM keys
1. S3 → create bucket, e.g. `yesboss-recordings`, region `ap-south-1` (keep
   "Block all public access" ON — the app uses presigned URLs).
2. IAM → create a user (programmatic), attach an inline policy scoped to the
   bucket:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Action": ["s3:PutObject","s3:GetObject","s3:ListBucket"],
       "Resource": [
         "arn:aws:s3:::yesboss-recordings",
         "arn:aws:s3:::yesboss-recordings/*"
       ]
     }]
   }
   ```
3. Save the **Access key ID** + **Secret access key** for the env file.

## 2. Launch EC2
- AMI: Ubuntu 22.04/24.04 LTS · type **t3.micro** · 30 GB gp3 (free) · new key pair.
- Security group inbound: **22** (your IP), **80** + **443** (anywhere, for TLS).
  You do *not* need to expose 4000 publicly — Caddy fronts it.
- SSH in: `ssh -i key.pem ubuntu@<EC2_PUBLIC_IP>`

## 3. Prep the host (Docker + swap)
1 GB RAM is tight — add swap so builds/Postgres don't OOM:
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Docker + compose plugin
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker ubuntu && newgrp docker
```

## 4. Get the code
```bash
git clone <your-repo-url> yes_boss && cd yes_boss
```

## 5. Configure secrets
```bash
cp apps/backend/.env.production.example apps/backend/.env.production
nano apps/backend/.env.production
```
Fill in: strong `POSTGRES_PASSWORD` (and the matching one in `DATABASE_URL`),
`JWT_SECRET` (`openssl rand -base64 48`), strong `ADMIN_PASSWORD`, the S3
keys/bucket/region, and the Groq key. Keep `MINIO_USE_SSL="true"`.

## 6. Start the stack
```bash
docker compose -f docker-compose.prod.yml --env-file apps/backend/.env.production up -d --build
```
- The backend container runs `prisma migrate deploy` on boot, then starts.
- Seed the admin user once:
  ```bash
  docker compose -f docker-compose.prod.yml exec backend npx ts-node prisma/seed.ts
  ```
- Check it: `curl http://localhost:4000/api/v1/health` (on the box).

## 7. HTTPS with Caddy (auto Let's Encrypt)
Point your DuckDNS domain at the EC2 public IP first, then:
```bash
# /home/ubuntu/Caddyfile
api.yourname.duckdns.org {
    reverse_proxy localhost:4000
}
```
```bash
docker run -d --name caddy --restart unless-stopped --network host \
  -v /home/ubuntu/Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data caddy:2
```
Caddy fetches a cert automatically. Verify:
`curl https://api.yourname.duckdns.org/api/v1/health`

## 8. Point the mobile app at production
In `apps/mobile/src/services/api/client.ts` set:
```ts
const PROD_API_URL = 'https://api.yourname.duckdns.org';
```
Rebuild + install the release APK:
```bash
cd apps/mobile/android && ./gradlew :app:assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```
No more `adb reverse` — the app reaches the cloud directly. Re-open Settings and
Save once so the device token + recap config re-sync to the new backend.

## 9. Verify end-to-end
- Login from the app (admin creds from the env file).
- Sync SMS / back up a call → confirm rows land and a recording opens (presigned
  S3 URL).
- Generate a recap → transcript + summary via Groq.

---

## Operating notes
- **Costs after 12 mo:** EC2 + S3 start billing. Cheapest forever-free path:
  keep self-hosted Postgres on EC2, move storage to **Backblaze B2** (swap the
  `MINIO_*` endpoint/region/keys), keep Groq.
- **Backups:** snapshot the `pgdata` volume (or `pg_dump` on a cron) — it holds
  all calls/SMS/recap data.
- **Storage growth:** the upcoming photo/video backup will grow S3 fast; watch
  the bucket size. S3 scales without disk resizing (the reason we didn't use
  MinIO on the box).
- **Memory:** if the t3.micro feels tight, the 2 GB swap covers spikes; Postgres
  + Node idle well under 1 GB for ~10 users.
- **Updates:** `git pull && docker compose -f docker-compose.prod.yml --env-file apps/backend/.env.production up -d --build`.
