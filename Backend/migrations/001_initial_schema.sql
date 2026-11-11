CREATE TABLE IF NOT EXISTS parishes (
  id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(32) NOT NULL,
  location VARCHAR(150) NULL,
  priest VARCHAR(150) NULL,
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_parishes_code (code)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS centres (
  id CHAR(36) NOT NULL,
  parish_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(150) NULL,
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_centres_id_parish (id, parish_id),
  UNIQUE KEY uq_centres_parish_name (parish_id, name),
  KEY idx_centres_parish (parish_id),
  CONSTRAINT fk_centres_parish FOREIGN KEY (parish_id) REFERENCES parishes (id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `groups` (
  id CHAR(36) NOT NULL,
  parish_id CHAR(36) NOT NULL,
  centre_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_groups_id_scope (id, centre_id, parish_id),
  UNIQUE KEY uq_groups_centre_name (centre_id, name),
  KEY idx_groups_parish (parish_id),
  KEY idx_groups_centre (centre_id),
  CONSTRAINT fk_groups_parish FOREIGN KEY (parish_id) REFERENCES parishes (id),
  CONSTRAINT fk_groups_centre_scope FOREIGN KEY (centre_id, parish_id)
    REFERENCES centres (id, parish_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  parish_id CHAR(36) NULL,
  centre_id CHAR(36) NULL,
  group_id CHAR(36) NULL,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('owner', 'parish', 'centre', 'group') NOT NULL,
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_parish (parish_id),
  KEY idx_users_centre_scope (centre_id, parish_id),
  KEY idx_users_group_scope (group_id, centre_id, parish_id),
  CONSTRAINT fk_users_parish FOREIGN KEY (parish_id) REFERENCES parishes (id),
  CONSTRAINT fk_users_centre_scope FOREIGN KEY (centre_id, parish_id)
    REFERENCES centres (id, parish_id),
  CONSTRAINT fk_users_group_scope FOREIGN KEY (group_id, centre_id, parish_id)
    REFERENCES `groups` (id, centre_id, parish_id),
  CONSTRAINT chk_users_role_scope CHECK (
    (role = 'owner' AND parish_id IS NULL AND centre_id IS NULL AND group_id IS NULL)
    OR (role = 'parish' AND parish_id IS NOT NULL AND centre_id IS NULL AND group_id IS NULL)
    OR (role = 'centre' AND parish_id IS NOT NULL AND centre_id IS NOT NULL AND group_id IS NULL)
    OR (role = 'group' AND parish_id IS NOT NULL AND centre_id IS NOT NULL AND group_id IS NOT NULL)
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS members (
  id CHAR(36) NOT NULL,
  parish_id CHAR(36) NOT NULL,
  centre_id CHAR(36) NOT NULL,
  group_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(32) NULL,
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_members_id_scope (id, group_id, centre_id, parish_id),
  KEY idx_members_parish (parish_id),
  KEY idx_members_parish_centre (parish_id, centre_id),
  KEY idx_members_parish_centre_group (parish_id, centre_id, group_id),
  CONSTRAINT fk_members_group_scope FOREIGN KEY (group_id, centre_id, parish_id)
    REFERENCES `groups` (id, centre_id, parish_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS contributions (
  id CHAR(36) NOT NULL,
  parish_id CHAR(36) NOT NULL,
  centre_id CHAR(36) NOT NULL,
  group_id CHAR(36) NOT NULL,
  member_id CHAR(36) NOT NULL,
  amount DECIMAL(14, 2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'KES',
  category VARCHAR(50) NOT NULL,
  contribution_date DATE NOT NULL,
  method ENUM('cash', 'm_pesa', 'bank_transfer', 'cheque', 'other') NOT NULL,
  reference VARCHAR(100) NULL,
  notes TEXT NULL,
  status ENUM('recorded', 'voided') NOT NULL DEFAULT 'recorded',
  created_by CHAR(36) NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  voided_by CHAR(36) NULL,
  voided_at TIMESTAMP NULL,
  void_reason VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contributions_scope (parish_id, centre_id, group_id),
  KEY idx_contributions_member (member_id),
  KEY idx_contributions_date (contribution_date),
  CONSTRAINT fk_contributions_member_scope FOREIGN KEY (member_id, group_id, centre_id, parish_id)
    REFERENCES members (id, group_id, centre_id, parish_id),
  CONSTRAINT fk_contributions_created_by FOREIGN KEY (created_by) REFERENCES users (id),
  CONSTRAINT fk_contributions_voided_by FOREIGN KEY (voided_by) REFERENCES users (id),
  CONSTRAINT chk_contributions_amount CHECK (amount > 0),
  CONSTRAINT chk_contributions_void_state CHECK (
    (status = 'recorded' AND voided_by IS NULL AND voided_at IS NULL AND void_reason IS NULL)
    OR (status = 'voided' AND voided_by IS NOT NULL AND voided_at IS NOT NULL AND void_reason IS NOT NULL)
  )
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  parish_id CHAR(36) NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id CHAR(36) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_logs_user (user_id),
  KEY idx_audit_logs_parish (parish_id),
  KEY idx_audit_logs_entity (entity_type, entity_id),
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id),
  CONSTRAINT fk_audit_logs_parish FOREIGN KEY (parish_id) REFERENCES parishes (id)
) ENGINE=InnoDB;
