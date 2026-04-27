# Household Budget — Setup Guide

## What you're deploying
A real-time shared budget tracker. Both you and your wife see the same data, live, from any device.
Stack: React → Vercel (free hosting) + Supabase (free database).

---

## Step 1 — Set up Supabase (the database)

1. Go to **https://supabase.com** → click "Start your project" → sign up (free)
2. Click **"New project"** → give it a name like `household-budget` → set a password → Create
3. Wait ~1 min for it to provision
4. In the left sidebar, click **"SQL Editor"**
5. Paste the entire SQL block below and click **Run**:

```sql
create table expenses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  date date not null,
  description text not null,
  category text not null,
  amount numeric(10,2) not null,
  paid_by text not null
);

create table budgets (
  id uuid primary key default gen_random_uuid(),
  category text unique not null,
  amount numeric(10,2) not null default 0
);

create table settings (
  key text primary key,
  value text not null
);

insert into budgets (category, amount) values
  ('Housing', 1200), ('Food', 800), ('Transport', 300),
  ('Health', 200), ('Entertainment', 200), ('Shopping', 300), ('Other', 200);

insert into settings (key, value) values
  ('p1_name', 'Partner 1'), ('p2_name', 'Partner 2'),
  ('p1_income', '0'), ('p2_income', '0');

alter publication supabase_realtime add table expenses;
alter publication supabase_realtime add table budgets;
alter publication supabase_realtime add table settings;

alter table expenses disable row level security;
alter table budgets disable row level security;
alter table settings disable row level security;
```

6. Go to **Project Settings → API** (gear icon in sidebar)
7. Copy two values — you'll need them in Step 3:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon / public key** (long string under "Project API keys")

---

## Step 2 — Push code to GitHub

Open your terminal in the `budget-app` folder:

```bash
cd budget-app

# Initialize git
git init
git add .
git commit -m "Initial commit"

# Create a new repo on GitHub (go to github.com → New repository → name it household-budget → Create)
# Then run the two lines GitHub shows you, which look like:
git remote add origin https://github.com/YOUR_USERNAME/household-budget.git
git push -u origin main
```

---

## Step 3 — Deploy on Vercel

1. Go to **https://vercel.com** → sign up with GitHub (free)
2. Click **"Add New Project"** → import your `household-budget` repo
3. Vercel auto-detects Create React App — click **"Deploy"** (no changes needed)
4. After it deploys, go to your project → **Settings → Environment Variables**
5. Add these two variables:

   | Name | Value |
   |------|-------|
   | `REACT_APP_SUPABASE_URL` | your Project URL from Step 1 |
   | `REACT_APP_SUPABASE_ANON_KEY` | your anon key from Step 1 |

6. Go to **Deployments** → click the three dots on your latest deploy → **Redeploy**
7. Your app is now live at something like `https://household-budget-xyz.vercel.app` 🎉

---

## Step 4 — Share with your wife

Just send her the Vercel URL. That's it. You both see the same data in real-time — any expense one of you adds appears instantly on the other's screen.

**Bookmark it on your phones** for easy access (Add to Home Screen on iOS/Android).

---

## Troubleshooting

- **Blank white screen**: Check Vercel logs — usually means env variables weren't set. Re-check Step 3 Step 5–6.
- **"Failed to fetch"**: Your Supabase URL or key is wrong. Double-check for extra spaces.
- **Data not syncing live**: Make sure you ran the `alter publication supabase_realtime` lines in the SQL editor.
