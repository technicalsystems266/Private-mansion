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
