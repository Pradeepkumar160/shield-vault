# 🛡️ ShieldVault — Secure File Upload & Virus Scanner          

A production-grade secure file upload service with a full web dashboard.
Every file is **AES-256 encrypted** and **ClamAV scanned** before storage.

---

## ✨ Features 

- 🔐 **AES-256-CBC encryption** on every uploaded file
- 🦠 **ClamAV virus scanning** — infected files go to quarantine automatically
- 🔗 **HMAC-SHA256 signed download URLs** (1-hour expiry)
- 📊 **Full web dashboard** — stats, file list, activity log, detail view
- 🔑 **JWT authentication** — register/login system
- 🗄️ **SQLite database** — tracks all files, scan results, and events
- 🐳 **Fully Dockerized** — one command to run
- 🟡 **Demo mode** — works without ClamAV (safe mode, no real scanning)

---

## 🚀 Quick Start (PowerShell + Docker)

### Option A — Full mode with real ClamAV scanning (Recommended)
```powershell
cd shield-vault
.\start.ps1
```
> ⚠️ First run downloads ~250MB of ClamAV virus definitions. Wait 2-3 minutes.

### Option B — Quick Demo mode (no ClamAV, instant start)
```powershell
cd shield-vault
.\start.ps1 -Quick
```

### Manual Docker commands (if PowerShell script doesn't work)
```powershell
# Full mode
docker compose up -d --build

# Quick demo mode
docker compose -f docker-compose.quick.yml up -d --build
```

---

## 🌐 Access

| | |
|---|---|
| **URL** | http://localhost:5000 |
| **Username** | `admin` |
| **Password** | `admin123` |

---

## 📁 Project Structure

```
shield-vault/
├── src/
│   ├── app.js                    # Express entry point
│   ├── public/
│   │   └── index.html            # Full web dashboard (single file)
│   ├── config/
│   │   ├── config.js             # App configuration
│   │   └── database.js           # SQLite setup
│   ├── controllers/
│   │   ├── authController.js     # Login / Register
│   │   └── fileController.js     # Upload / Download / List / Delete
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT verification
│   │   └── uploadMiddleware.js   # Multer file handling
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── fileRoutes.js
│   ├── services/
│   │   ├── encryptionService.js  # AES-256-CBC
│   │   ├── scanService.js        # ClamAV with fallback
│   │   ├── signedUrlService.js   # HMAC-SHA256 URLs
│   │   ├── webhookService.js     # Optional webhook callbacks
│   │   └── storageService.js
│   └── utils/
│       └── logger.js
├── uploads/                      # Temp upload staging
├── encrypted/                    # Encrypted file storage
├── quarantine/                   # Infected files
├── data/                         # SQLite database
├── Dockerfile
├── docker-compose.yml            # Full (with ClamAV)
├── docker-compose.quick.yml      # Quick (demo mode)
├── start.ps1                     # PowerShell launcher
└── .env
```

---

## 🔌 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Get JWT token |
| POST | `/api/auth/register` | No | Create account |
| GET | `/api/auth/me` | JWT | Current user info |
| POST | `/api/files/upload` | JWT | Upload a file |
| GET | `/api/files/list` | JWT | List all files |
| GET | `/api/files/stats` | JWT | Dashboard stats |
| GET | `/api/files/:uuid` | JWT | File details + logs |
| GET | `/api/files/download/:name` | Signed URL | Download encrypted file |
| POST | `/api/files/regenerate-url/:uuid` | JWT | New signed URL |
| DELETE | `/api/files/:uuid` | JWT | Delete file |
| GET | `/api/health` | No | Health check |

---

## 🛠️ Management Commands

```powershell
.\start.ps1 -Stop     # Stop all containers
.\start.ps1 -Logs     # Live log output
.\start.ps1 -Rebuild  # Rebuild after code changes
```

---

## 🔧 Configuration (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 5000 | Server port |
| `JWT_SECRET` | (set) | JWT signing secret |
| `ENCRYPTION_KEY` | (set) | Must be exactly 32 chars |
| `SIGNED_URL_SECRET` | (set) | Download URL signing secret |
| `WEBHOOK_URL` | (empty) | Optional POST webhook on scan |
| `CLAMAV_HOST` | clamav | ClamAV container hostname |
| `CLAMAV_PORT` | 3310 | ClamAV daemon port |

---

## 🧪 Test with curl (after login)   

```bash
# 1. Get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 2. Upload file (replace TOKEN) 
curl -X POST http://localhost:5000/api/files/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@yourfile.pdf"

# 3. List files
curl http://localhost:5000/api/files/list \
  -H "Authorization: Bearer TOKEN"
```
