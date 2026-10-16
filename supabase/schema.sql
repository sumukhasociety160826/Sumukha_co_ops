-- =============================================================================
-- Sumukha Co-Op Society - Production PostgreSQL Schema & Security Policies
-- Cloud Backend: Supabase Free Tier
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Members Table
CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    monthly_commitment NUMERIC NOT NULL DEFAULT 5000,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    password TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. User Profiles (Linked with Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    member_id INT REFERENCES members(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Monthly Contributions Table
CREATE TABLE IF NOT EXISTS contributions (
    id BIGSERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    month TEXT NOT NULL, -- Format: 'YYYY-MM'
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_member_month UNIQUE (member_id, month)
);

-- 4. Loans Table
CREATE TABLE IF NOT EXISTS loans (
    id BIGSERIAL PRIMARY KEY,
    member_id INT NOT NULL REFERENCES members(id) ON DELETE RESTRICT,
    principal_amount NUMERIC NOT NULL CHECK (principal_amount > 0),
    monthly_interest_rate NUMERIC NOT NULL DEFAULT 1.0,
    monthly_principal_pct NUMERIC NOT NULL DEFAULT 5.0,
    tenure_months INT NOT NULL DEFAULT 20,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    foreclosed_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Loan Repayments Table
CREATE TABLE IF NOT EXISTS loan_repayments (
    id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Investments Table
CREATE TABLE IF NOT EXISTS investments (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('FD', 'Mutual fund', 'Stocks', 'Gold', 'Real estate', 'Other')),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    cost_amount NUMERIC NOT NULL CHECK (cost_amount >= 0),
    current_value NUMERIC NOT NULL CHECK (current_value >= 0),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Row Level Security (RLS) & Column Compatibility
-- =============================================================================

-- Ensure column exists if members table was created in an earlier run
ALTER TABLE members ADD COLUMN IF NOT EXISTS password TEXT;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current authenticated user is an Admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies to prevent "policy already exists" errors
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile upon signup" ON profiles;

DROP POLICY IF EXISTS "Members can view members" ON members;
DROP POLICY IF EXISTS "Admins have full CRUD on members" ON members;
DROP POLICY IF EXISTS "Allow public read on members" ON members;
DROP POLICY IF EXISTS "Allow public write on members" ON members;

DROP POLICY IF EXISTS "Members can view contributions" ON contributions;
DROP POLICY IF EXISTS "Admins have full CRUD on contributions" ON contributions;
DROP POLICY IF EXISTS "Allow public read on contributions" ON contributions;
DROP POLICY IF EXISTS "Allow public write on contributions" ON contributions;

DROP POLICY IF EXISTS "Members can view loans" ON loans;
DROP POLICY IF EXISTS "Admins have full CRUD on loans" ON loans;
DROP POLICY IF EXISTS "Allow public read on loans" ON loans;
DROP POLICY IF EXISTS "Allow public write on loans" ON loans;

DROP POLICY IF EXISTS "Members can view repayments" ON loan_repayments;
DROP POLICY IF EXISTS "Admins have full CRUD on repayments" ON loan_repayments;
DROP POLICY IF EXISTS "Allow public read on repayments" ON loan_repayments;
DROP POLICY IF EXISTS "Allow public write on repayments" ON loan_repayments;

DROP POLICY IF EXISTS "Members can view investments" ON investments;
DROP POLICY IF EXISTS "Admins have full CRUD on investments" ON investments;
DROP POLICY IF EXISTS "Allow public read on investments" ON investments;
DROP POLICY IF EXISTS "Allow public write on investments" ON investments;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can manage all profiles" ON profiles FOR ALL USING (is_admin());
CREATE POLICY "Users can insert their own profile upon signup" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Members Policies (Allow read and write for the client portal)
CREATE POLICY "Allow public read on members" ON members FOR SELECT USING (true);
CREATE POLICY "Allow public write on members" ON members FOR ALL USING (true) WITH CHECK (true);

-- Contributions Policies
CREATE POLICY "Allow public read on contributions" ON contributions FOR SELECT USING (true);
CREATE POLICY "Allow public write on contributions" ON contributions FOR ALL USING (true) WITH CHECK (true);

-- Loans Policies
CREATE POLICY "Allow public read on loans" ON loans FOR SELECT USING (true);
CREATE POLICY "Allow public write on loans" ON loans FOR ALL USING (true) WITH CHECK (true);

-- Loan Repayments Policies
CREATE POLICY "Allow public read on repayments" ON loan_repayments FOR SELECT USING (true);
CREATE POLICY "Allow public write on repayments" ON loan_repayments FOR ALL USING (true) WITH CHECK (true);

-- Investments Policies
CREATE POLICY "Allow public read on investments" ON investments FOR SELECT USING (true);
CREATE POLICY "Allow public write on investments" ON investments FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- Initial Data Migration: 13 Members & Historical Records
-- =============================================================================

INSERT INTO members (id, name, email, phone, monthly_commitment, is_admin, password) VALUES
(1, 'Adith', 'adith@example.com', '+91 98765 43210', 10000, false, NULL),
(2, 'Kiran', 'kiran@example.com', '+91 98765 43211', 5000, false, NULL),
(3, 'Madhusudhan', 'madhusudhan@example.com', '+91 98765 43212', 10000, false, NULL),
(4, 'Manohar', 'manohar@example.com', '+91 98765 43213', 5000, false, NULL),
(5, 'Muniraj', 'muniraj@example.com', '+91 98765 43214', 5000, false, NULL),
(6, 'Naveen', 'naveenkumarm6563@gmail.com', '8951264083', 5000, true, 'Naveen@123'),
(7, 'Prakash', 'prakash@example.com', '+91 98765 43216', 10000, false, NULL),
(8, 'Ram Dorai', 'ramdorai@example.com', '+91 98765 43217', 10000, false, NULL),
(9, 'Rakshith', 'rakshith@example.com', '+91 98765 43218', 10000, false, NULL),
(10, 'Sagar', 'mysagar95@gmail.com', '8892983068', 10000, true, 'sagar@123'),
(11, 'Tejas', 'tejas@example.com', '+91 98765 43220', 10000, false, NULL),
(12, 'Varun', 'varun@example.com', '+91 98765 43221', 5000, false, NULL),
(13, 'Virata Yashwanth', 'yashwanth@example.com', '+91 98765 43222', 10000, false, NULL)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  is_admin = EXCLUDED.is_admin,
  password = COALESCE(members.password, EXCLUDED.password);

-- Historical Loans
INSERT INTO loans (id, member_id, principal_amount, monthly_interest_rate, monthly_principal_pct, tenure_months, issue_date) VALUES
(1791551938588, 11, 100000, 1.0, 5.0, 20, '2026-08-20'),
(1791552149360, 4, 70000, 1.0, 5.0, 20, '2026-09-20'),
(1791552174793, 10, 45000, 1.0, 5.0, 20, '2026-09-20')
ON CONFLICT (id) DO NOTHING;

-- Recorded Repayments
INSERT INTO loan_repayments (loan_id, amount, payment_date) VALUES
(1791551938588, 6000, '2026-10-09')
ON CONFLICT (id) DO NOTHING;

-- Historical Contributions (August & September 2026)
INSERT INTO contributions (id, member_id, month, amount, payment_date) VALUES
(1791536015649, 1, '2026-08', 10000, '2026-10-09'),
(1791536092179, 2, '2026-08', 5000, '2026-10-09'),
(1791536100878, 3, '2026-08', 10000, '2026-10-09'),
(1791536117275, 4, '2026-08', 5000, '2026-10-09'),
(1791536132000, 5, '2026-08', 5000, '2026-10-09'),
(1791536141573, 6, '2026-08', 5000, '2026-10-09'),
(1791536148212, 7, '2026-08', 10000, '2026-10-09'),
(1791536156487, 8, '2026-08', 10000, '2026-10-09'),
(1791536169735, 9, '2026-08', 10000, '2026-10-09'),
(1791536175583, 10, '2026-08', 10000, '2026-10-09'),
(1791536183062, 11, '2026-08', 10000, '2026-10-09'),
(1791536194148, 12, '2026-08', 5000, '2026-10-09'),
(1791536199908, 13, '2026-08', 10000, '2026-10-09'),
(1791552001166, 1, '2026-09', 10000, '2026-10-09'),
(1791552011622, 2, '2026-09', 5000, '2026-10-09'),
(1791552018071, 3, '2026-09', 10000, '2026-10-09'),
(1791552026017, 4, '2026-09', 5000, '2026-10-09'),
(1791552038205, 5, '2026-09', 5000, '2026-10-09'),
(1791552044415, 6, '2026-09', 5000, '2026-10-09'),
(1791552050543, 7, '2026-09', 10000, '2026-10-09'),
(1791552058802, 8, '2026-09', 10000, '2026-10-09'),
(1791552064174, 9, '2026-09', 10000, '2026-10-09'),
(1791552072354, 10, '2026-09', 10000, '2026-10-09'),
(1791552077162, 11, '2026-09', 10000, '2026-10-09'),
(1791552097309, 12, '2026-09', 5000, '2026-10-09'),
(1791552107640, 13, '2026-09', 10000, '2026-10-09')
ON CONFLICT (id) DO NOTHING;

