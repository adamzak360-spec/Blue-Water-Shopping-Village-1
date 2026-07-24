-- Migration: Add delivery fee columns to products table
-- These columns store per-product delivery fees for different shipping options

ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_tamale INTEGER DEFAULT 50;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_greater_accra INTEGER DEFAULT 30;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_lesser_accra INTEGER DEFAULT 15;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_fedex INTEGER DEFAULT 150;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_dhl INTEGER DEFAULT 150;
ALTER TABLE products ADD COLUMN IF NOT EXISTS delivery_fee_ups INTEGER DEFAULT 150;
