# Private Mansion

A single-user, desktop-first media library. Paste a Google Drive share link to a ZIP; the server downloads and extracts it, uploads supported media to private S3-compatible storage (Cloudflare R2 recommended), and indexes it in SQLite.

## Important hosting requirement

GitHub stores the source and runs CI. GitHub Actions runners are temporary and are not suitable for hosting a continuously available gallery or processing multi-gigabyte archives. Deploy this Docker app to a persistent container host with a persistent volume mounted at `/data`. Do not deploy the importer as a Vercel serverless function.

## Required configuration

Copy `.env.example` values into your host's secret/environment settings. Set a long random `APP_SECRET`, create a private R2 bucket, and provide its S3 endpoint, access key and secret. Never commit real credentials. The bucket must remain private; the app issues short-lived signed media URLs.

Set Google Drive sharing to **Anyone with the link — Viewer**. The server handles the standard Drive download confirmation page. Google Drive can still block downloads due to quota, permission, or anti-abuse limits; the app reports those failures.

## Run locally

Requires Node.js 22+ and a persistent writable `DATA_DIR`.

```sh
cp .env.example .env
npm install
npm start
```

For local tests, use `npm test`. Docker:

```sh
docker build -t private-mansion .
docker run --env-file .env -p 3000:3000 -v mansion-data:/data private-mansion
```

Open port 3000. Enter the APP_SECRET on the unlock screen.

## GitHub

The included workflow runs the Node test suite on pushes and pull requests. To publish a container image, configure GitHub Actions permissions and a registry destination. A deployment target and its credentials must be configured separately; GitHub cannot supply persistent runtime storage by itself.

## Limits and safety

Default archive limit is 5 GiB and expanded media limit is 30 GiB. ZIP paths are normalized and traversal entries ignored. Only common image/video formats are imported. Temporary archive and extraction files are removed after each job. Use a host with enough scratch disk for the ZIP plus extracted files and adequate memory/disk throughput.

## Run it directly in GitHub Codespaces (no R2 account needed)

1. Open the repository and choose **Code → Codespaces → Create codespace on main**.
2. Wait for setup to finish. The dev container installs dependencies and starts the gallery on port 3000.
3. Open the forwarded **Private Mansion Gallery** port. Unlock with the development key shown in `.devcontainer/devcontainer.json` (change it in Codespaces settings before using this for anything sensitive).
4. Paste the Google Drive ZIP share link and choose **Import ZIP**. The ZIP is downloaded directly into the Codespace workspace, extracted, and stored under `.data/media`; the gallery reads the files from there.

The Codespace must remain running while importing and viewing. Its workspace persists when stopped, subject to Codespaces storage/retention and account quota. A 2GB archive needs enough available Codespaces disk space for the ZIP and extracted files. The browser port is private to your GitHub account by default.

## GitHub Actions one-off import

Open **Actions → Import Drive ZIP (temporary runner) → Run workflow**, paste the Drive URL, and start it. This downloads and safely extracts supported media, then publishes a short-lived artifact named `private-mansion-media` (one-day retention). Actions does not host a browsable gallery; use Codespaces for in-browser viewing. Artifact storage limits and runner disk limits still apply.
