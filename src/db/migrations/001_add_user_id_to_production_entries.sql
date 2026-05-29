-- Migration 001 : ajout user_id dans production_entries
ALTER TABLE production_entries
  ADD COLUMN user_id VARCHAR(36) NULL AFTER product_id,
  ADD CONSTRAINT fk_production_entries_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
