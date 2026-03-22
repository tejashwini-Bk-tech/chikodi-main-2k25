-- Quick bucket creation script
-- Run this in Supabase SQL Editor

-- Step 1: Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-docs',
  'provider-docs', 
  false,
  52428800,
  ARRAY['image/png', 'image/jpeg', 'video/mp4', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies
DROP POLICY IF EXISTS "Users can upload their own provider documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own provider documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own provider documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own provider documents" ON storage.objects;

CREATE POLICY "Users can upload their own provider documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'provider-docs' AND 
  auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Users can view their own provider documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'provider-docs' AND 
  auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Users can update their own provider documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'provider-docs' AND 
  auth.uid()::text = SPLIT_PART(name, '/', 1)
);

CREATE POLICY "Users can delete their own provider documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'provider-docs' AND 
  auth.uid()::text = SPLIT_PART(name, '/', 1)
);
