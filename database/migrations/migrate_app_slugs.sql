-- Migration: add slug column to apps and backfill from name
ALTER TABLE apps
  ADD COLUMN IF NOT EXISTS slug VARCHAR(120) UNIQUE;

CREATE INDEX IF NOT EXISTS ix_apps_slug ON apps (slug);

-- Backfill slugs for all existing apps.
-- Slugify: lowercase, replace non-alphanumeric runs with hyphens, trim edges.
-- Collision handling: append -2, -3, ... until unique within this batch.
DO $$
DECLARE
  rec     RECORD;
  base    TEXT;
  candidate TEXT;
  suffix  INT;
BEGIN
  FOR rec IN
    SELECT id, name FROM apps WHERE slug IS NULL ORDER BY id
  LOOP
    base := lower(trim(rec.name));
    base := regexp_replace(base, '[^a-z0-9]+', '-', 'g');
    base := trim(both '-' from base);
    base := left(base, 100);

    candidate := base;
    suffix    := 2;

    WHILE EXISTS (SELECT 1 FROM apps WHERE slug = candidate) LOOP
      candidate := base || '-' || suffix;
      suffix    := suffix + 1;
    END LOOP;

    UPDATE apps SET slug = candidate WHERE id = rec.id;
  END LOOP;
END $$;
