# Linux installation and support

BuonApp runs on current Linux distributions through AppImage, deb, rpm, and Snap packages. Choose the format your distribution supports best.

> **Linux packages are not published as releases.** Only the Windows installer is
> built and uploaded by the release workflow. Everything below still works, but
> you have to build the package yourself first — see [Building the packages](#building-the-packages).

## Packages

| Format | For |
|--------|-----|
| **AppImage** (`buonapp-*.AppImage`) | Any distro — no install needed |
| **deb** (`buonapp-*.deb`) | Debian / Ubuntu and derivatives |
| **rpm** (`buonapp-*.rpm`) | Fedora, RHEL-family, and compatible distributions |
| **Snap** (`buonapp-*.snap`) | Snap-enabled distributions |

All four formats are configured for x64 and arm64.

```bash
# deb
sudo dpkg -i buonapp-*.deb && sudo apt-get install -f

# AppImage
chmod +x buonapp-*.AppImage && ./buonapp-*.AppImage
```

---

## Building the packages

On a Linux machine with Node.js 22 or later:

```bash
git clone https://github.com/MrD0me/BuonApp.git
cd BuonApp
npm install
npm run build:linux
```

`electron-builder` writes the AppImage, deb, rpm, and snap files into `release/`.
Building the snap additionally needs `snapcraft` and LXD available locally.

---

## AppImage and FUSE

AppImage needs FUSE to mount at runtime.

```bash
# Ubuntu 22.04 / Debian 12
sudo apt install libfuse2

# Ubuntu 24.04+
sudo apt install libfuse2t64
```

No FUSE? Run extracted:

```bash
./buonapp-*.AppImage --appimage-extract
./squashfs-root/AppRun
```

---

## Updates

The in-app updater looks for Linux artifacts in this repository's GitHub
Releases, and finds none, because only the Windows installer is published. On
Linux, update by pulling the repository and rebuilding:

```bash
git pull
npm install
npm run build:linux
```

Your database and backups live in the user-data directory, outside the package,
so rebuilding and reinstalling does not touch them. Take a manual backup first
all the same.

---

## Printing

| Capability | Status |
|------------|--------|
| Network (TCP port 9100) | ✅ Works |
| USB via CUPS (`lp`) | ✅ Works — needs CUPS |
| Auto-detect make/model | ⚠ Returns Generic for everything |

```bash
# Install CUPS
sudo apt install cups && sudo systemctl enable --now cups

# Add yourself to the lp group if USB access is denied
sudo usermod -aG lp $USER
```

Add/configure printers at `http://localhost:631`.

---

## System tray

Window close hides the app — use the tray to get it back or quit.

| Action | Result |
|--------|--------|
| Click **×** | Window hides |
| Left-click tray / **Show** | Window shows |
| **Quit** | Clean shutdown (DB, servers, mDNS) |

> If the tray icon doesn't appear (i3, Sway, bare WMs), install `trayer` or
> `stalonetray`. Alternatively use **File → Exit** inside the app.

---

## Get help

Include your BuonApp version, Linux distribution/version, package format, and relevant app logs when reporting a problem. Do not delete your local database to diagnose a startup issue; create or restore a backup first.
