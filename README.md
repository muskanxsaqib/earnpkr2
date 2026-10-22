# 🚀 Task Earn Hub (Turnkey SaaS Platform)

A high-performance, military-grade secure daily earning, investment packages, and multi-currency task reward platform powered by **Next.js 16 (Turbopack) + React 19 + Supabase + Tailwind CSS**.

---

## ⚡ 1-Minute Turnkey Setup Guide (Zero-Friction Cloning)

Jab bhi aap yeh repository kisi naye client ya hosting ke liye clone karein, sirf yeh **3 simple steps** karein:

### 1️⃣ Clone and Install Dependencies
```bash
git clone https://github.com/muskanxsaqib/saqibearnn.git
cd saqibearnn
npm install
```

---

### 2️⃣ Configure Environment Variables (`.env.local`)
Create `.env.local` in the project root folder (or it will be automatically created on first `npm run dev`):

```env
# Supabase Project Credentials (Supabase Dashboard -> Settings -> API)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Optional: Digital DRM Domain Whitelist
NEXT_PUBLIC_ALLOWED_DOMAINS="localhost,127.0.0.1,vercel.app,yourdomain.com"
```
*(Supports `NEXT_PUBLIC_SUPABASE_URL`, `VITE_SUPABASE_URL`, or `SUPABASE_URL` flexibly)*

---

### 3️⃣ 1-Click Database Setup (`npm run setup:db`)
Run this single command in your terminal:
```bash
npm run setup:db
```
* **Auto-Copy**: Yeh command khud ba khud `master_schema.sql` aapke clipboard par copy kar degi!
* **Auto-Browser**: Direct aapke naye Supabase project ka SQL Editor browser mein open kar degi:  
  `https://supabase.com/dashboard/project/<your-project-id>/sql/new`
* **Paste & Run**: Bas SQL editor mein **Ctrl + V** karein aur green button **"RUN"** daba dein!
* Tamam **18 Tables**, **16 Security Triggers**, **Realtime WebSockets**, aur **Coupons** 2 second mein configure ho jayenge!

---

### 4️⃣ Start Development Server
```bash
npm run dev
```
Open **`http://localhost:3001`** in your browser. Server starts instantly in < 1 second! ⚡

---

## 🛠️ Available NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Auto-verifies `.env.local` and starts Next.js Turbopack dev server on port `3001`. |
| `npm run setup:db` | 1-Click database health check, auto-copies schema, and opens SQL Editor. |
| `npm run build` | Builds optimized production bundle with tree-shaking and security headers. |
| `npm run start` | Starts production server on port `3001`. |
| `npm test` | Runs the full automated verification test suite. |

---

## 🛡️ Architecture & Features
* **Zero-Loss Base Currency**: PostgreSQL database engine handles all accounting strictly in base PKR (Rs.).
* **Multi-Currency System**: Real-time presentation switching between PKR (`Rs.`), USD (`$`), INR (`₹`), and USDT (`₮`).
* **Supabase Realtime WebSockets**: Instant live updates for balances, deposits, and claims without page refreshes.
* **Military-Grade Security**: Terminal bot blockers, sliding-window rate limiters, anti-devtools shield, anti-clone killswitch, and atomic row-locking balance deductions.
