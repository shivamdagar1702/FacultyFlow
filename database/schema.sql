CREATE DATABASE IF NOT EXISTS facultyflow_v2
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE facultyflow_v2;

CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL UNIQUE,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_student_id VARCHAR(40) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('STUDENT','FACULTY','HOD','ADMIN') NOT NULL,
  department_id INT NULL,
  designation VARCHAR(100) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS leave_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  description VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS leave_balances (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  opening_balance DECIMAL(6,2) NOT NULL DEFAULT 0,
  used_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_balance (faculty_id, leave_type_id),
  FOREIGN KEY (faculty_id) REFERENCES users(id),
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id)
);

CREATE TABLE IF NOT EXISTS leave_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  faculty_id INT NOT NULL,
  leave_type_id INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(6,2) NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('PENDING_HOD','PENDING_ADMIN','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING_HOD',
  current_approver_id INT NULL,
  hod_comment TEXT NULL,
  admin_comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (faculty_id) REFERENCES users(id),
  FOREIGN KEY (leave_type_id) REFERENCES leave_types(id),
  FOREIGN KEY (current_approver_id) REFERENCES users(id),
  INDEX idx_leave_status_approver (status, current_approver_id),
  INDEX idx_leave_dates (start_date, end_date)
);

CREATE TABLE IF NOT EXISTS approval_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  leave_id INT NOT NULL,
  actor_id INT NOT NULL,
  actor_role VARCHAR(20) NOT NULL,
  decision ENUM('SUBMITTED','APPROVED','REJECTED','CANCELLED') NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (leave_id) REFERENCES leave_applications(id),
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  actor_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id INT NULL,
  details JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id)
);

INSERT IGNORE INTO departments(name, code) VALUES
('Computer Science and Engineering','CSE'),
('Management','MGT'),
('Electrical Engineering','EE'),
('Mechanical Engineering','ME'),
('Applied Sciences','AS');

INSERT IGNORE INTO leave_types(name, description) VALUES
('Casual Leave','Short personal leave'),
('Medical Leave','Leave for medical reasons'),
('Earned Leave','Planned earned leave'),
('Duty Leave','Official university duty');
