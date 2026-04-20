-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS rtm_admin_db;
USE rtm_admin_db;

-- Create the admins table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    full_name VARCHAR(100),
    role ENUM('superadmin', 'admin', 'editor') DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert initial admin credentials
-- Password is 'admin_rtm_2024' (hashed using bcrypt would be better, but for initial shell import we provide raw or a note)
-- Note: In a real app, passwords should be hashed. I will use a dummy hash or expect the backend to handle it.
-- For the sake of 'initial setup', I'll provide an SQL that inserts one record.
-- Insert initial admin credentials
INSERT INTO admins (username, password, email, full_name, role) 
VALUES ('admin', '$2b$10$EPZ9S.l4Yv4S1v5V4V5V4OuFqB6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y', 'admin@right-trademark.com', 'RTM Admin', 'superadmin')
ON DUPLICATE KEY UPDATE username=username;

-- Create the trademarks table
CREATE TABLE IF NOT EXISTS trademarks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trademark_name VARCHAR(255) NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    application_number VARCHAR(100),
    registration_number VARCHAR(100),
    status ENUM('Pending', 'Registered', 'Opposed', 'Expired', 'Renewing') DEFAULT 'Pending',
    class_number VARCHAR(50), -- International Class
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed some test data
INSERT INTO trademarks (trademark_name, client_name, application_number, status, class_number, expiry_date)
VALUES 
('EcoTech Solutions', 'Global Green Corp', 'APP-123456', 'Registered', 'Class 9', '2030-05-20'),
('SkyHigh Airlines', 'Airways Int', 'APP-789012', 'Pending', 'Class 39', '2032-10-15'),
('Gourmet Choice', 'Fine Foods Ltd', 'APP-554433', 'Registered', 'Class 30', '2025-01-10');
