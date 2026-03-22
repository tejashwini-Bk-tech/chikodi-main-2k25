-- Create provider-docs bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'provider-docs',
  'provider-docs',
  false,
  52428800, -- 50MB in bytes
  ARRAY['image/png', 'image/jpeg', 'video/mp4', 'image/webp']
);

-- Create policies for provider-docs bucket
-- Users can upload their own files
CREATE POLICY "Users can upload their own provider documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'provider-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own files
CREATE POLICY "Users can view their own provider documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'provider-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own files
CREATE POLICY "Users can update their own provider documents" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'provider-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
CREATE POLICY "Users can delete their own provider documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'provider-docs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
