-- ==============================================================================
-- Migration: 003_add_is_public.sql
-- Description: Add is_public column to public.media ('true' = Public | 'false' = Private)
-- ==============================================================================

-- 1. Add is_public column with default true (Public)
ALTER TABLE public.media
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

-- 2. Index on is_public for fast filtering
CREATE INDEX IF NOT EXISTS idx_media_is_public ON public.media(is_public);
