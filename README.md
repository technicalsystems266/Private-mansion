# Private Mansion — on-demand Codespaces gallery

Private Mansion is a single-user, desktop-first media viewer. Start a GitHub Codespace only when you want to use the gallery. Paste a Google Drive ZIP share link; the Codespace downloads it directly, extracts supported photos/videos, creates image thumbnails, and displays the library in the browser. You do not download or extract the archive on your own device.

## Start it when you want to view pictures

1. Open https://github.com/technicalsystems266/Private-mansion
2. Select **Code → Codespaces → Create codespace on main**.
3. Wait for setup to finish. The gallery opens automatically on forwarded port 3000. If it does not, open the **Ports** tab and click the browser/open icon beside port 3000.
4. Unlock with the initial Codespaces access key below.
5. Paste the Google Drive share link and select **Import ZIP**. Keep the Codespace running until the import completes.
6. Browse, search, and open photos/videos in the gallery.
7. When finished, stop the Codespace from the Codespaces menu. Its workspace files persist when stopped; start the same Codespace again next time.

Initial access key: `private-mansion-codespaces-access-key`. Change APP_SECRET in the Codespaces devcontainer configuration if you want a different key. Keep the Codespace and forwarded port private.

## What runs where

GitHub stores the application source. GitHub Actions runs automated tests and can build a container image. The actual import and gallery run only while your Codespace is running. Media files and the SQLite index are stored under `/workspaces/Private-mansion/data` in the Codespace workspace. No R2 account, separate hosting service, or always-on server is required for this mode.

Codespaces storage persists across stop/start, but it is not a permanent archive or backup. Do not delete the Codespace if you want to keep the extracted library. Large imports need enough Codespaces disk capacity for the ZIP, extracted media, thumbnails, and database. A 2GB archive can expand substantially. Defaults are a 5GiB ZIP limit and 30GiB expanded-media limit.

## Google Drive

Set the ZIP sharing to **Anyone with the link — Viewer**. Paste its share URL into the gallery. The server handles Google's usual large-download confirmation page where possible. Google may still deny a download if the file is private, quota-limited, or otherwise blocked; the import status will show the reason.

The original ZIP in Drive is not changed. The temporary downloaded ZIP is removed after extraction.

## Local development

Requires Node.js 22+, then:

```sh
npm install
APP_SECRET=replace-this-with-a-long-secret DATA_DIR=./data STORAGE_MODE=local npm start
```

The Docker configuration is retained for optional persistent-host deployment. Codespaces is the intended on-demand workflow.
