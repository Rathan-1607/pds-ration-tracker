CREATE DATABASE IF NOT EXISTS pds_ration;
USE pds_ration;

CREATE TABLE IF NOT EXISTS users (
  username VARCHAR(50) PRIMARY KEY,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS card_holders (
  card VARCHAR(20) PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  type VARCHAR(20) NOT NULL,
  members INT NOT NULL,
  address VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_items (
  item VARCHAR(50) PRIMARY KEY,
  emoji VARCHAR(8) NOT NULL,
  qty DECIMAL(12,2) NOT NULL,
  unit VARCHAR(10) NOT NULL,
  color VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date VARCHAR(30) NOT NULL,
  item VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL,
  qty VARCHAR(40) NOT NULL,
  source VARCHAR(100) NOT NULL,
  balance VARCHAR(50) NOT NULL
);

CREATE TABLE IF NOT EXISTS distributions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reference VARCHAR(50) UNIQUE,
  card VARCHAR(20) NOT NULL,
  name VARCHAR(120) NOT NULL,
  item VARCHAR(100) NOT NULL,
  qty VARCHAR(40) NOT NULL,
  date VARCHAR(30) NOT NULL,
  status VARCHAR(30) NOT NULL
);

INSERT IGNORE INTO users (username, password, name) VALUES ('admin', 'admin', 'Admin Officer');

INSERT IGNORE INTO card_holders (card, name, type, members, address, status) VALUES
  ('RC-40012', 'Ramesh Kumar', 'BPL', 5, 'Ward 7, Patna', 'Active'),
  ('RC-40078', 'Sunita Devi', 'AAY', 3, 'Village Siwan', 'Active'),
  ('RC-40155', 'Arjun Singh', 'APL', 6, 'Block B, Gaya', 'Active'),
  ('RC-40203', 'Priya Sharma', 'PHH', 4, 'Sector 12, Ranchi', 'Active'),
  ('RC-40290', 'Mohammad Irfan', 'BPL', 7, 'Ward 3, Bhagalpur', 'Inactive'),
  ('RC-40341', 'Lakshmi Naidu', 'AAY', 2, 'Village Darbhanga', 'Active');

INSERT IGNORE INTO stock_items (item, emoji, qty, unit, color) VALUES
  ('Rice', '🍚', 3200, 'kg', 'var(--primary)'),
  ('Wheat', '🌾', 120, 'kg', '#dc2626'),
  ('Sugar', '🍬', 85, 'kg', '#eab308'),
  ('Dal', '🫘', 60, 'kg', '#dc2626'),
  ('Kerosene', '🛢️', 4985, 'L', 'var(--secondary)');

INSERT IGNORE INTO stock_log (date, item, type, qty, source, balance) VALUES
  ('15 Dec 2024', '🍚 Rice', 'Received', '+500 kg', 'FCI Depot', '3200 kg'),
  ('14 Dec 2024', '🌾 Wheat', 'Distributed', '-80 kg', 'Ward 7', '120 kg'),
  ('13 Dec 2024', '🍬 Sugar', 'Distributed', '-40 kg', 'Block B', '85 kg'),
  ('12 Dec 2024', '🫘 Dal', 'Received', '+200 kg', 'State Depot', '260 kg'),
  ('11 Dec 2024', '🛢️ Kerosene', 'Received', '+1000 L', 'IOC', '4985 L');

INSERT IGNORE INTO distributions (reference, card, name, item, qty, date, status) VALUES
  ('D-1001', 'RC-40012', 'Ramesh Kumar', '🍚 Rice', '5 kg', '15 Dec 2024', 'Delivered'),
  ('D-1002', 'RC-40012', 'Ramesh Kumar', '🌾 Wheat', '5 kg', '15 Dec 2024', 'Delivered'),
  ('D-1003', 'RC-40078', 'Sunita Devi', '🍚 Rice', '4 kg', '15 Dec 2024', 'Delivered'),
  ('D-1004', 'RC-40078', 'Sunita Devi', '🍬 Sugar', '3 kg', '15 Dec 2024', 'Delivered'),
  ('D-1005', 'RC-40155', 'Arjun Singh', '🌾 Wheat', '5 kg', '14 Dec 2024', 'Pending'),
  ('D-1006', 'RC-40155', 'Arjun Singh', '🫘 Dal', '3 kg', '14 Dec 2024', 'Pending'),
  ('D-1007', 'RC-40203', 'Priya Sharma', '🍚 Rice', '5 kg', '14 Dec 2024', 'Delivered');
