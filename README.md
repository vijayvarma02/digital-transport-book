# Digital Transport Book (Driver Register)

A **very simple, mobile-first web app** designed specifically for small transport owners to replace physical notebook registers with a phone-friendly digital register.

---

## 🎯 Purpose & Philosophy

This application is **NOT a dashboard**. 
- ❌ No charts or graphs
- ❌ No analytics or statistics cards
- ❌ No desktop sidebars or complicated menus
- ❌ No hover-dependent buttons

Instead, it feels exactly like **a digital notebook**:
- **Clean white ledger rows** with high contrast and clear numbers.
- **Large touch targets** (min 48–60px) designed for single-hand phone usage.
- **Immediate numeric keypad entry** when tapping any daily amount.
- **Instant feedback**: `Saving...` → `Saved` in a few seconds.

---

## 📱 Main User Flow

```
Open app → Select driver → Select month → See daily table → Enter/update today's amount
```

### Screen 1 — Driver List
- Title: **Driver Records**
- Current Month & Year displayed clearly.
- Large full-width touchable rows for each driver:
  - **Ramesh**
  - **Suresh**
  - **Mahesh**
  - **Ravi**
  - **Kiran**
  - **Anil**
  - **Rajesh**
  - **Srinu**
  - **Vijay**
  - **Naresh**
- Shows whether today's amount has already been recorded (`Today: ₹800` or `Today: —`).
- Simple button at the bottom to add more drivers when needed.

### Screen 2 — Driver's Monthly Register
- Top bar: `← Back` and driver's name in bold.
- Simple month navigation: `< October 2026 >` with month picker.
- Minimal 2-column table:
  - **Date** | **Amount**
  - Today's row is clearly highlighted with a distinct `[ ₹800 ]` or `[ + Enter ]` editable button.
  - Automatically scrolls to today's date upon opening.
  - Empty days show `—`.
- Bottom pinned summary:
  - **Total** | **₹5,700**

### Daily Entry UX
- Tapping any date opens a focused bottom sheet.
- Large numeric input with `₹` symbol and phone's numeric keypad (`inputMode="numeric"`).
- Quick amount chips (₹500, ₹750, ₹800, ₹850, ₹1000) for 1-tap entry.
- Large **Save** button with visual feedback (`Saving...` → `Saved`).
- "Clear this day" option if the owner wants to reset an entry to blank (`—`).

---

## 🛠 Technology Stack

- **Frontend**: React 19, Tailwind CSS v4, Lucide Icons, Vite
- **Backend / Database**: Supabase (PostgreSQL)
- **Local Fallback**: Built-in localStorage persistence ensuring 100% offline functionality out-of-the-box even without Supabase credentials.

---

## 🗄 Database Schema (Supabase / PostgreSQL)

The schema SQL is located in `supabase/schema.sql`:

```sql
-- 1. Drivers Table
CREATE TABLE IF NOT EXISTS public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Daily Records Table
CREATE TABLE IF NOT EXISTS public.daily_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_driver_date UNIQUE (driver_id, date)
);

-- 3. Index for fast monthly lookups
CREATE INDEX IF NOT EXISTS idx_daily_records_driver_date 
ON public.daily_records (driver_id, date);
```

### Setting up Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
4. Or, tap the gear icon (⚙️) on the top right of the app screen to enter your Supabase URL & Key directly from the browser!

---

## 🚀 Running the App Locally

```bash
# 1. Install dependencies
npm install

# 2. Run dev server
npm run dev

# 3. Build for production
npm run build
```

Open `http://localhost:5173` on your browser or phone.

## Private profiles, Due amounts and passcode login

Existing projects: run supabase/profile-upgrade.sql in the Supabase SQL editor. New projects: run schema.sql first, then profile-upgrade.sql. The migration replaces public access policies on both register tables with owner-only policies.

Login is passcode-only through the register-login Supabase Edge Function. There is no email setup. See supabase/PASSCODE_SETUP.md for the migration, secret and deployment steps. The passcode belongs in Supabase secrets, never in frontend .env or VITE_* variables. Supabase sessions are kept in browser session storage, and Log out ends access on the device. Run passcode-login.sql after profile-upgrade.sql.

Photos go into the private driver-files bucket (5 MB per JPG/PNG/WebP), while drivers stores profile_photo, aadhaar_photos and license_photos paths. Add a driver, then open its profile using the pencil. Choose photos to preview them locally, discard any unwanted selections, then use Upload photos (or Replace photo). Saved images appear as thumbnails and can be opened in a full-screen viewer. Contact details save separately without closing the profile. Aadhaar and licence allow multiple images. View links expire after five minutes. No PAN field is included. Uploads require Supabase; demo mode cannot store identity documents.

Daily entries now contain Amount and independently entered Pending amount, shown as Due. Blank Amount with a Due value saves Amount as zero; clearing a day removes both values. Monthly totals and PDFs include both columns. Cloud failures are shown instead of silently saving to local demo storage.

Driver deletion requires typing DELETE in a confirmation dialog. For existing databases, run `supabase/driver-delete-fix.sql` once in Supabase SQL Editor to repair the daily-record foreign key so deleting a driver also deletes their records atomically. This migration does not delete existing data. Photos are removed only after the database deletion succeeds; a storage cleanup failure is reported separately.

Daily notes: run supabase/daily-notes.sql once for an existing database. The final Notes column shows a small note icon; tap it to read the note in a compact popup without changing row height. Tap + Add for an empty note, or tap the day to edit an existing note. Notes are included in PDF exports. Driver photos are larger; tap a photo on the list or register to open the profile.

Profile loading: run supabase/profile-thumbnails.sql once for an existing project. New profile uploads generate a private thumbnail of at most 320 pixels while preserving the original photo. Existing profile photos gain thumbnails gradually as they become visible, with at most two conversions running concurrently. The first visit to an older photo may still load its original while the thumbnail is prepared. Avatar and document links are signed in batches (up to 50 paths), reused for 4.5 minutes, and only refreshed while visible. Driver lists are cached for two minutes; returning to the list reuses them immediately, and edits/uploads/deletions update the cache. Caches are in memory and cleared when the user logs out or switches project/account. No Edge Function changes are needed for thumbnails.
