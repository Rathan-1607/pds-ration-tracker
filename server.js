const express = require('express');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pds_ration',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function getUser(username, password) {
  const rows = await query('SELECT username, name FROM users WHERE username = ? AND password = ?', [username, password]);
  return rows[0];
}

function formatStockItem(row) {
  return {
    item: row.item,
    emoji: row.emoji,
    qty: Number(row.qty),
    unit: row.unit,
    color: row.color,
  };
}

function formatStockLog(row) {
  return {
    date: row.date,
    item: row.item,
    type: row.type,
    qty: row.qty,
    source: row.source,
    balance: row.balance,
  };
}

function formatDistribution(row) {
  return {
    id: row.reference || `D-${row.id}`,
    card: row.card,
    name: row.name,
    item: row.item,
    qty: row.qty,
    date: row.date,
    status: row.status,
  };
}

app.get('/api/ping', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, time: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/api/login', async (req, res) => {
  const { user, pass } = req.body || {};
  if (!user || !pass) {
    return res.status(400).json({ ok: false, message: 'Missing credentials' });
  }
  try {
    const match = await getUser(user, pass);
    if (!match) {
      return res.status(401).json({ ok: false, message: 'Invalid username or password' });
    }
    res.json({ ok: true, user: match });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.get('/api/cardholders', async (req, res) => {
  try {
    const rows = await query('SELECT card, name, type, members, address, status FROM card_holders ORDER BY card');
    res.json({ ok: true, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/api/cardholders', async (req, res) => {
  const { card, name, type, members, address } = req.body || {};
  if (!card || !name) {
    return res.status(400).json({ ok: false, message: 'Card and name are required' });
  }
  try {
    await query(
      `INSERT INTO card_holders (card, name, type, members, address, status)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         type = VALUES(type),
         members = VALUES(members),
         address = VALUES(address),
         status = VALUES(status)`,
      [card.trim(), name.trim(), type || 'APL', Number(members) || 1, address || '-', 'Active']
    );
    const rows = await query('SELECT card, name, type, members, address, status FROM card_holders WHERE card = ?', [card.trim()]);
    res.json({ ok: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.get('/api/stock', async (req, res) => {
  try {
    const rows = await query('SELECT item, emoji, qty, unit, color FROM stock_items ORDER BY item');
    res.json({ ok: true, data: rows.map(formatStockItem) });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.get('/api/stock/log', async (req, res) => {
  try {
    const rows = await query('SELECT date, item, type, qty, source, balance FROM stock_log ORDER BY id DESC LIMIT 100');
    res.json({ ok: true, data: rows.map(formatStockLog) });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/api/stock', async (req, res) => {
  const { item, qty, source } = req.body || {};
  if (!item || qty == null) {
    return res.status(400).json({ ok: false, message: 'Item and quantity are required' });
  }
  const metaMap = {
    Rice: { emoji: '🍚', unit: 'kg' },
    Wheat: { emoji: '🌾', unit: 'kg' },
    Sugar: { emoji: '🍬', unit: 'kg' },
    Dal: { emoji: '🫘', unit: 'kg' },
    Kerosene: { emoji: '🛢️', unit: 'L' },
  };
  const meta = metaMap[item] || { emoji: '📦', unit: 'kg' };
  const amount = Number(qty);
  if (Number.isNaN(amount)) {
    return res.status(400).json({ ok: false, message: 'Quantity must be a number' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existingRows] = await connection.execute('SELECT qty FROM stock_items WHERE item = ?', [item]);
    const existing = existingRows[0];
    if (existing) {
      await connection.execute('UPDATE stock_items SET qty = qty + ? WHERE item = ?', [amount, item]);
    } else {
      await connection.execute(
        'INSERT INTO stock_items (item, emoji, qty, unit, color) VALUES (?, ?, ?, ?, ?)',
        [item, meta.emoji, amount, meta.unit, 'var(--primary)']
      );
    }
    const balanceQty = existing ? Number(existing.qty) + amount : amount;
    const balance = `${balanceQty} ${meta.unit}`;
    const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const [insertResult] = await connection.execute(
      'INSERT INTO stock_log (date, item, type, qty, source, balance) VALUES (?, ?, ?, ?, ?, ?)',
      [date, `${meta.emoji} ${item}`, 'Received', `+${amount} ${meta.unit}`, source || 'Manual Entry', balance]
    );
    await connection.commit();
    const [updatedRows] = await connection.execute('SELECT item, emoji, qty, unit, color FROM stock_items WHERE item = ?', [item]);
    const row = updatedRows[0];
    res.json({ ok: true, data: { updated: formatStockItem(row), log: { date, item: `${meta.emoji} ${item}`, type: 'Received', qty: `+${amount} ${meta.unit}`, source: source || 'Manual Entry', balance } } });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ ok: false, message: err.message });
  } finally {
    connection.release();
  }
});

app.get('/api/distributions', async (req, res) => {
  try {
    const rows = await query('SELECT id, reference, card, name, item, qty, date, status FROM distributions ORDER BY id DESC LIMIT 100');
    res.json({ ok: true, data: rows.map(formatDistribution) });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.post('/api/distributions', async (req, res) => {
  const { card, name, item, qty, status } = req.body || {};
  if (!card || !item || qty == null) {
    return res.status(400).json({ ok: false, message: 'Card, item, and quantity are required' });
  }
  const amount = Number(qty);
  if (Number.isNaN(amount)) {
    return res.status(400).json({ ok: false, message: 'Quantity must be a number' });
  }
  const metaMap = {
    Rice: { emoji: '🍚', unit: 'kg' },
    Wheat: { emoji: '🌾', unit: 'kg' },
    Sugar: { emoji: '🍬', unit: 'kg' },
    Dal: { emoji: '🫘', unit: 'kg' },
    Kerosene: { emoji: '🛢️', unit: 'L' },
  };
  const meta = metaMap[item] || { emoji: '📦', unit: 'kg' };
  const itemLabel = `${meta.emoji} ${item}`;
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  try {
    const result = await query(
      'INSERT INTO distributions (reference, card, name, item, qty, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`D-${Date.now()}`, card, name || 'Unknown', itemLabel, `${amount} ${meta.unit}`, date, status || 'Pending']
    );
    const rows = await query('SELECT id, reference, card, name, item, qty, date, status FROM distributions WHERE id = ?', [result.insertId]);
    res.json({ ok: true, data: formatDistribution(rows[0]) });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

app.use(express.static(path.join(__dirname)));

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
});
