-- ==============================================================================
-- Migration: 002_add_access_tier.sql
-- Description: Add access_tier column to public.media ('free' | 'premium')
-- and update RLS to allow public to view media
-- ==============================================================================

-- 1. Add access_tier column with default 'premium'
ALTER TABLE public.media
ADD COLUMN IF NOT EXISTS access_tier text NOT NULL DEFAULT 'premium'
CHECK (access_tier IN ('free', 'premium'));

-- 2. Index on access_tier for fast filtering
CREATE INDEX IF NOT EXISTS idx_media_access_tier ON public.media(access_tier);

-- 3. Ensure RLS on public.media allows anyone (anon & authenticated) to view
DROP POLICY IF EXISTS "Authenticated users can view media" ON public.media;
DROP POLICY IF EXISTS "Anyone can view media" ON public.media;
CREATE POLICY "Anyone can view media"
  ON public.media FOR SELECT
  TO public
  USING (true);
