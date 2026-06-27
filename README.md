# Gym Supplement Inventory and Billing Management System

A premium, modern, and offline-first desktop application wrapper for a gym supplement store, designed for a single admin/owner. Built using **Vite + React + Express + SQLite3** (for local desktop usage) and fully cloud-ready for **PostgreSQL** (for secure, free hosting on Vercel).

---

## 🚀 How to Deploy to Vercel for Free (24/7 Online)

Follow this step-by-step guide to host the application online on **Vercel** with a secure, persistent cloud database.

### Step 1: Create a Free Cloud Postgres Database
Since Vercel runs in a serverless environment, local files (`supplements.db`) cannot be saved. You need a free cloud database.
1. Sign up for a free account at **[Neon.tech](https://neon.tech/)** (or **[Supabase.com](https://supabase.com/)**).
2. Create a new project (e.g. `supplement-store`).
3. Under the Neon dashboard, copy your **PostgreSQL Connection String**. It will look like this:
   `postgres://alex:PASSWORD@ep-cool-snowflake-12345.us-east-2.aws.neon.tech/neondb?sslmode=require`
   *(Ensure `sslmode=require` is appended for security).*

---

### Step 2: Push your Code to GitHub
Vercel deploys directly from GitHub and auto-updates every time you commit code.
1. Open a terminal in the project root directory (`gym-supplement-system`).
2. Run the following commands to initialize and commit:
   ```bash
   git init
   git add .
   git commit -m "Configure Vercel serverless deployment"
   ```
3. Go to [GitHub](https://github.com/), create a new **Private Repository** (e.g., `gym-supplement-system`).
4. Follow the GitHub instructions to link your local folder and push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/gym-supplement-system.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 3: Deploy on Vercel
1. Sign up for a free account at **[Vercel.com](https://vercel.com/)** using your GitHub account.
2. Click **Add New...** -> **Project**.
3. Import your `gym-supplement-system` repository.
4. Vercel will automatically detect the Vite + Express structure. Configure the settings:
   * **Framework Preset**: Choose **Vite** or leave as **Other** (Vercel auto-configures it).
   * **Root Directory**: Leave blank (root `./`).
   * **Build Command**: Leave blank, or enter: `npm run install:all && npm run build:frontend`
     *(Vercel will use our root script to install and compile both folders).*
   * **Output Directory**: `frontend/dist`
5. Open the **Environment Variables** panel and add:
   * **Key**: `DATABASE_URL`
   * **Value**: *(Paste the PostgreSQL connection string you copied in Step 1)*
6. Click **Deploy**.

Vercel will build your assets and deploy the backend Express API as a Vercel Serverless Function. Within a minute, it will provide a public HTTPS URL (e.g., `https://gym-supplement-system.vercel.app`) that you can open from any device (phone, laptop, desktop) to access your supplements inventory and POS billing securely!
