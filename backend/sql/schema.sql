-- Workout & Running Tracker schema (MySQL 8). 7 tabel yang saling terhubung lewat foreign key.
CREATE DATABASE IF NOT EXISTS fitlog CHARACTER SET utf8mb4;
USE fitlog;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- owner_id NULL = gerakan global (dikelola admin); terisi = gerakan pribadi user
CREATE TABLE IF NOT EXISTS exercises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  muscle_group VARCHAR(60) NOT NULL,
  split ENUM('push','pull','legs','core') NOT NULL,
  owner_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  split ENUM('push','pull','legs','core') NOT NULL,
  session_date DATE NOT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS session_sets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  exercise_id INT NOT NULL,
  set_no INT NOT NULL,
  reps INT NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL,
  FOREIGN KEY (session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS personal_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  exercise_id INT NOT NULL,
  weight_kg DECIMAL(6,2) NOT NULL,
  reps INT NOT NULL,
  sets INT NOT NULL DEFAULT 1,
  achieved_at DATE NOT NULL,
  UNIQUE KEY uq_user_exercise (user_id, exercise_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS run_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  distance ENUM('5K','10K','21K','42K') NOT NULL,
  duration_seconds INT NOT NULL,
  run_date DATE NOT NULL,
  notes VARCHAR(255) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
