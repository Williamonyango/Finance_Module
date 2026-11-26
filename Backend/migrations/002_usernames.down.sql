ALTER TABLE users ADD COLUMN email VARCHAR(254) NULL AFTER name;

UPDATE users
SET email = CONCAT(username, '@legacy.invalid');

ALTER TABLE users
  MODIFY email VARCHAR(254) NOT NULL,
  DROP INDEX uq_users_username,
  DROP COLUMN username,
  ADD UNIQUE KEY uq_users_email (email);
