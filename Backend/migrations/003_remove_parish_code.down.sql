ALTER TABLE parishes ADD COLUMN code VARCHAR(32) NULL AFTER name;

UPDATE parishes
SET code = CONCAT('PAR-', LEFT(REPLACE(id, '-', ''), 28));

ALTER TABLE parishes
  MODIFY code VARCHAR(32) NOT NULL,
  ADD UNIQUE KEY uq_parishes_code (code);
