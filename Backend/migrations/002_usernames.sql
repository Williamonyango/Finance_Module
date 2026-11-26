ALTER TABLE users ADD COLUMN username VARCHAR(128) NULL AFTER name;

UPDATE users
SET username = CONCAT('user-', REPLACE(id, '-', ''));

ALTER TABLE users
  MODIFY username VARCHAR(128) NOT NULL,
  DROP INDEX uq_users_email,
  DROP COLUMN email,
  ADD UNIQUE KEY uq_users_username (username);
