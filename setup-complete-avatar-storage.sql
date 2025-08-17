-- Complete Avatar Storage Setup for Remy React Forum
-- Run this entire script in the Supabase SQL Editor

-- 1. Create the avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- 3. Create storage policies for the avatars bucket

-- Policy 1: Allow authenticated users to upload avatars to their own folder
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 2: Allow authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 3: Allow authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy 4: Allow anyone to view avatars (public read access)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT 
TO public
USING (bucket_id = 'avatars');

-- 5. Verify the setup
SELECT 
  'Bucket created successfully' as status,
  b.name,
  b.public,
  b.file_size_limit,
  b.allowed_mime_types
FROM storage.buckets b 
WHERE b.name = 'avatars';

-- 6. List all policies for the avatars bucket
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%avatar%'
ORDER BY policyname;