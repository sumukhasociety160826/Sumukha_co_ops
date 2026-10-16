# Sumukha Co-Operative Society - Full-Stack Production Platform

A modern, responsive, production-ready cooperative micro-financing platform built for **Sumukha Co-Op Society**, designed to run on **100% free-tier cloud infrastructure** (Supabase + Vercel / Cloudflare Pages) with zero monthly cost.

---

## 🌟 Key Features

### 1. Role-Based Access Control (Admin vs Regular Member)
- **Designated Admins Only** (e.g. Adith, Prakash):
  - Protected with Master Admin Security PIN (`180826`) or Supabase Auth.
  - Full CRUD operations: Add/edit members, change monthly commitments, record single contributions, **1-Click "Add this month for all" batch action**, issue loans, record repayments, foreclose loans, and manage investments.
- **Regular Members (Users)**:
  - **Strictly View-Only Access**: All modification buttons and forms are completely hidden and disabled.
  - Dedicated personal dashboard with personal equity share %, contribution history, pending dues, active loan card, and **1-Click Personal Statement PDF download**.
- **Public View**:
  - High-level transparency overview without disclosing sensitive individual loan figures.

### 2. PDF Export Engine (Any Month & Member Receipts)
- **Monthly Society Statement**:
  - Select **any month** (current or historical) to generate a formal, printable PDF with the society header, financial KPIs, member-by-member payment breakdown, loan activities, and signature blocks.
- **Individual Member Statement**:
  - Download a personalized statement of account and payment receipt.

### 3. Automated 3-Stage Email Reminders (100% Free)
- Automatically dispatches reminders before the monthly collection date:
  - **7 Days Before**: Friendly advance notice of the upcoming collection date.
  - **3 Days Before**: Gentle reminder sent **only to members whose contribution is pending**.
  - **1 Day Before**: Urgent final notice to unpaid members.
- Includes an in-app Reminders Hub to preview and manually trigger reminders, plus a standalone script (`scripts/send-reminders.js`) for scheduled GitHub Actions cron jobs.

### 4. Comprehensive Loan Analytics (All Requested Details)
Every active loan displays:
- **Date Loan Taken** (`issue_date`)
- **Total Tenure** (e.g. 20 months)
- **Monthly Installment Paying (EMI)** (Principal + Interest breakdown)
- **Total Amount Paid So Far** (split into Principal repaid vs Interest paid)
- **Number of Months Paid** (e.g. 1 / 20)
- **Number of Months Remaining** (e.g. 19 Months)
- **Outstanding Principal Balance**
- **Next Due Date & Amount**
- **Foreclosure Calculation** with 2-month lock-in policy
- **Toggleable Month-by-Month Amortization Schedule Table**

### 5. All Legacy Fields from `public-view` Preserved
- 6 Master KPI Cards: Total contributions, Cash in hand (red if negative), Loans outstanding, Invested cost, Investment value, and Net profit.
- Member Summary table with visual equity share progress bar.
- Member-wise Contributions Matrix (`cwise`) across all historical months.
- Investments portfolio and Month-wise aggregation (`mwise`).

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Navigate to the project directory
cd C:\Users\Admin\OneDrive\Documents\Sumukha_project

# 2. Run the development server
npx vite
# or
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

## ☁️ Step-by-Step Free Cloud Hosting Guide ($0/Month Forever)

### Step 1: Set Up Free PostgreSQL Database on Supabase
1. Go to **[supabase.com](https://supabase.com)** and sign up for a free account.
2. Click **New Project** and name it `sumukha-society`.
3. Open the **SQL Editor** tab in your Supabase dashboard.
4. Copy the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) and click **Run**.
   - This sets up all tables, Row Level Security (RLS) policies, and automatically seeds all 13 members, historical contributions, and active loans.

### Step 2: Deploy Frontend on Vercel / Cloudflare Pages (Free)
#### Option A: Vercel (Recommended)
1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Sumukha Co-Op Society platform"
   git remote add origin https://github.com/<your-username>/sumukha-society-app.git
   git push -u origin main
   ```
2. Log in to **[vercel.com](https://vercel.com)** and click **Add New Project**.
3. Select your `sumukha-society-app` GitHub repo.
4. Framework Preset: **Vite** (Build command: `npm run build`, Output directory: `dist`).
5. Click **Deploy**. Your app is now live with global CDN, free SSL, and 99.99% uptime!

#### Option B: Cloudflare Pages
1. Go to **[pages.cloudflare.com](https://pages.cloudflare.com)** and connect your GitHub repo.
2. Build command: `npm run build`, Output folder: `dist`.
3. Deploy!

### Step 3: Schedule Automated Email Reminders via GitHub Actions (Free)
In your GitHub repo, create `.github/workflows/reminders.yml`:
```yaml
name: Monthly Email Reminders
on:
  schedule:
    - cron: '0 4 * * *' # Runs daily at 04:00 UTC
  workflow_dispatch:

jobs:
  remind:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: node scripts/send-reminders.js
```

---

## 🔐 Credentials & Default Access
- **Admin PIN**: `180826`
- **Member View**: Click the user badge in the header, select **Member**, and choose any member name to experience the strictly view-only portal.
