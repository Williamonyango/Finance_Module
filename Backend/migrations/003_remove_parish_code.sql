ALTER TABLE parishes
  DROP INDEX uq_parishes_code,
  DROP COLUMN code;
