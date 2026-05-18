# PDS Ration Distribution Backend

This project now includes a MySQL-backed Node.js backend for the PDS ration distribution app.

## Files added
- `server.js` — Express API server with MySQL integration
- `package.json` — Node package manifest for backend dependencies
- `.env.example` — database connection example
- `schema.sql` — MySQL schema and initial seed data

## Setup
1. Install Node.js (version 16+).
2. Install MySQL server and create a database if you don't already have one.
3. Copy `.env.example` to `.env` and update the values:
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - `PORT`
4. Run the schema script in MySQL:
   - `mysql -u root -p < schema.sql`
5. Open a terminal in `c:\Users\Rathan.R\OneDrive\Desktop\Emotion\lala`.
6. Run `npm install`.
7. Start the server with `npm start`.
8. Open `http://localhost:3000` in your browser.

## Notes
- This backend uses MySQL for persistence.
- Seed data includes sample users, card holders, stock items, stock logs, and distributions.
- Login with `admin` / `admin`.
