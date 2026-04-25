-- Migration: set is_multi_review = true for all apps
UPDATE apps SET is_multi_review = TRUE;
