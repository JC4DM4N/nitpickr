-- Migration: add profile fields to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS twitter_username VARCHAR(50) DEFAULT NULL;
