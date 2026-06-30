# Supabase Setup — 10 minutes

## Step 1: Create a free project
1. Go to https://supabase.com → Sign up (free)
2. New project → name it "hireflow" → set a password → choose region: Singapore (closest to India)
3. Wait ~2 min for project to spin up

## Step 2: Run the SQL schema
1. In Supabase dashboard → click **SQL Editor** (left sidebar)
2. Open `supabase_schema.sql` from this folder
3. Paste the entire file → click **Run**
4. You should see: "Success. No rows returned"

## Step 3: Get your API keys
1. Supabase dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
   - **anon public** key (long JWT string)

## Step 4: Update .env
Open `.env` file in this folder and replace:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE
```
With your actual values.

## Step 5: Restart the app
```
npm run dev
```
Or double-click `start.bat`

## What gets saved automatically
| Action | Saved to |
|--------|----------|
| Pipeline run completes | `pipeline_runs` + `candidates` tables |
| Care ticket approved | `care_tickets` table |
| Sales prospects generated | `sales_sessions` table |
| Support chat completes | `support_sessions` table |

## Verify it's working
- Run a pipeline → go to HireFlow → History
- You'll see "DB connected" badge (green)
- Past runs appear with candidate details you can click into

## For judges
You can show the Supabase dashboard live — it shows the actual PostgreSQL tables with real data from your demo run. That's impressive.
