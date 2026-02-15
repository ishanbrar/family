-- ══════════════════════════════════════════════════════════
-- Legacy – Supabase Database Schema
-- Ancestry & Health Platform
-- ══════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ──────────────────────────────────────────────
-- 1. FAMILIES (Grouping) — must come first
-- ──────────────────────────────────────────────
CREATE TABLE families (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  created_by  UUID,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 2. PROFILES
-- ──────────────────────────────────────────────
-- Note: `id` references auth.users for authenticated members,
-- but non-auth family members get a generated UUID (see policy below).
CREATE TABLE profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  display_name    TEXT,
  gender          TEXT CHECK (gender IN ('female', 'male')),
  avatar_url      TEXT,
  date_of_birth   DATE,
  place_of_birth  TEXT,
  profession      TEXT,
  location_city   TEXT,
  location_lat    DOUBLE PRECISION,
  location_lng    DOUBLE PRECISION,
  pets            TEXT[] DEFAULT '{}'::TEXT[],
  social_links    JSONB DEFAULT '{}'::JSONB,
  about_me        TEXT,
  country_code    TEXT,
  role            TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  is_alive        BOOLEAN DEFAULT TRUE,
  family_id       UUID REFERENCES families(id) ON DELETE SET NULL,
  auth_user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create profile automatically on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, auth_user_id, first_name, last_name, gender)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
    CASE
      WHEN NEW.raw_user_meta_data->>'gender' IN ('female', 'male') THEN NEW.raw_user_meta_data->>'gender'
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ──────────────────────────────────────────────
-- 3. RELATIONSHIPS
-- ──────────────────────────────────────────────
CREATE TABLE relationships (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relative_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN (
    'parent', 'child', 'sibling', 'spouse',
    'half_sibling', 'grandparent', 'grandchild',
    'aunt_uncle', 'maternal_aunt', 'paternal_aunt', 'maternal_uncle', 'paternal_uncle',
    'niece_nephew', 'cousin'
  )),
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, relative_id, type),
  CHECK (user_id <> relative_id)
);

CREATE INDEX idx_relationships_user ON relationships(user_id);
CREATE INDEX idx_relationships_relative ON relationships(relative_id);
CREATE INDEX idx_relationships_type ON relationships(type);

-- ──────────────────────────────────────────────
-- 4. MEDICAL CONDITIONS (Reference Table)
-- ──────────────────────────────────────────────
CREATE TABLE medical_conditions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN (
    'hereditary', 'chronic', 'autoimmune', 'mental_health', 'other'
  )),
  description TEXT NOT NULL,
  icd_code    TEXT
);

-- ──────────────────────────────────────────────
-- 5. USER CONDITIONS (Many-to-Many Junction)
-- ──────────────────────────────────────────────
CREATE TABLE user_conditions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  condition_id  UUID NOT NULL REFERENCES medical_conditions(id) ON DELETE CASCADE,
  severity      TEXT NOT NULL DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe')),
  age_of_onset  INTEGER CHECK (age_of_onset >= 0 AND age_of_onset <= 150),
  notes         TEXT,
  diagnosed_at  DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, condition_id)
);

CREATE INDEX idx_user_conditions_user ON user_conditions(user_id);
CREATE INDEX idx_user_conditions_condition ON user_conditions(condition_id);

-- ──────────────────────────────────────────────
-- 6. PRE-SEED: Common Hereditary Conditions
-- ──────────────────────────────────────────────
INSERT INTO medical_conditions (name, type, description, icd_code) VALUES
  ('Diabetes Type 2',         'hereditary',    'A chronic condition affecting blood sugar metabolism. Strong hereditary component with lifestyle factors.',                  'E11'),
  ('Hypertension',            'chronic',       'Persistent high blood pressure that increases risk of heart disease and stroke.',                                            'I10'),
  ('Breast Cancer',           'hereditary',    'Malignant growth in breast tissue. BRCA1/BRCA2 gene mutations significantly increase risk.',                                'C50'),
  ('Colorectal Cancer',       'hereditary',    'Cancer of the colon or rectum, often linked to Lynch syndrome and familial adenomatous polyposis.',                          'C18'),
  ('Sickle Cell Disease',     'hereditary',    'Inherited blood disorder causing abnormal hemoglobin, leading to misshapen red blood cells.',                                'D57'),
  ('Cystic Fibrosis',         'hereditary',    'Genetic disorder affecting the lungs and digestive system through thick mucus production.',                                  'E84'),
  ('Huntington''s Disease',   'hereditary',    'Progressive neurodegenerative disorder caused by a single autosomal dominant mutation.',                                     'G10'),
  ('Hemophilia A',            'hereditary',    'X-linked bleeding disorder caused by deficiency of clotting factor VIII.',                                                   'D66'),
  ('Alzheimer''s Disease',    'hereditary',    'Progressive neurodegenerative disease. APOE-e4 gene variant increases risk significantly.',                                  'G30'),
  ('Parkinson''s Disease',    'hereditary',    'Neurodegenerative disorder affecting movement. LRRK2 and GBA gene mutations increase risk.',                                'G20'),
  ('Glaucoma',                'hereditary',    'Group of eye conditions damaging the optic nerve, often with increased intraocular pressure.',                               'H40'),
  ('Asthma',                  'hereditary',    'Chronic respiratory condition causing airway inflammation and breathing difficulties.',                                      'J45'),
  ('Celiac Disease',          'autoimmune',    'Autoimmune disorder triggered by gluten, damaging the small intestine lining.',                                              'K90.0'),
  ('Rheumatoid Arthritis',    'autoimmune',    'Chronic autoimmune disorder causing joint inflammation, pain, and progressive destruction.',                                 'M05'),
  ('Lupus (SLE)',             'autoimmune',    'Systemic autoimmune disease where the immune system attacks healthy tissue throughout the body.',                             'M32'),
  ('Bipolar Disorder',        'mental_health', 'Mental health condition with extreme mood swings between mania and depression. Strong genetic link.',                        'F31'),
  ('Schizophrenia',           'mental_health', 'Chronic mental disorder affecting perception, thought processes, and emotional responsiveness.',                             'F20'),
  ('Major Depression',         'mental_health', 'Persistent depressive disorder with significant genetic heritability component.',                                           'F33'),
  ('Thalassemia',             'hereditary',    'Inherited blood disorder causing less hemoglobin production, leading to anemia.',                                            'D56'),
  ('Marfan Syndrome',         'hereditary',    'Connective tissue disorder affecting the heart, eyes, blood vessels, and skeleton.',                                         'Q87.4')
ON CONFLICT (name) DO NOTHING;

-- ──────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS) Policies
-- ──────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles in their family, edit own or as admin
CREATE POLICY "Users can view family profiles"
  ON profiles FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth_user_id = auth.uid());

CREATE POLICY "Admins can update any family profile"
  ON profiles FOR UPDATE
  USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

CREATE POLICY "Admins can insert family members"
  ON profiles FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT family_id FROM profiles WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
    OR auth_user_id = auth.uid()
  );

CREATE POLICY "Admins can delete unclaimed family members"
  ON profiles FOR DELETE
  USING (
    auth_user_id IS NULL
    AND family_id IN (
      SELECT family_id FROM profiles WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Relationships: Viewable by family members, manageable by admins
CREATE POLICY "Family members can view relationships"
  ON relationships FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE family_id IN (
        SELECT family_id FROM profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage relationships"
  ON relationships FOR ALL
  USING (
    user_id IN (
      SELECT p.id FROM profiles p
      WHERE p.family_id IN (
        SELECT family_id FROM profiles WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
      )
    )
    AND relative_id IN (
      SELECT p.id FROM profiles p
      WHERE p.family_id IN (
        SELECT family_id FROM profiles WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
      )
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT p.id FROM profiles p
      WHERE p.family_id IN (
        SELECT family_id FROM profiles WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
      )
    )
    AND relative_id IN (
      SELECT p.id FROM profiles p
      WHERE p.family_id IN (
        SELECT family_id FROM profiles WHERE auth_user_id = auth.uid() AND role = 'ADMIN'
      )
    )
  );

-- Medical conditions: Public read
CREATE POLICY "Anyone can read conditions"
  ON medical_conditions FOR SELECT
  USING (true);

-- User conditions: Own or family
CREATE POLICY "Users can manage own conditions"
  ON user_conditions FOR ALL
  USING (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "Family can view conditions"
  ON user_conditions FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM profiles WHERE family_id IN (
        SELECT family_id FROM profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Families: Members can view their own family, admins can update
CREATE POLICY "Members can view own family"
  ON families FOR SELECT
  USING (
    id IN (SELECT family_id FROM profiles WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "Admins can update family"
  ON families FOR UPDATE
  USING (
    id IN (SELECT family_id FROM profiles WHERE auth_user_id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Authenticated users can create families"
  ON families FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ──────────────────────────────────────────────
-- 8. STORAGE – Avatar Uploads
-- ──────────────────────────────────────────────
-- Run in the Supabase dashboard under Storage > Create bucket:
-- Bucket name: avatars
-- Public: true (so avatar URLs are publicly accessible)
--
-- Then add these storage policies:

-- Allow authenticated users to upload to their own folder
-- INSERT policy: bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]

-- Allow anyone to view avatars (public bucket)
-- SELECT policy: bucket_id = 'avatars'

-- Allow users to delete their own avatars
-- DELETE policy: bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
