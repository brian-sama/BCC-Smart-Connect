require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function migrate() {
  console.log('Connecting to Neon PostgreSQL database...');

  try {
    const migrationsDir = path.join(__dirname, '../../sql/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    console.log(`Found ${migrationFiles.length} migration files in sql/migrations`);

    for (const file of migrationFiles) {
      console.log(`\nApplying migration: ${file}...`);
      const sqlPath = path.join(migrationsDir, file);
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');

      await pool.query(sqlContent);
      console.log(`✓ Migration ${file} applied successfully.`);
    }

    // Verify WhatsApp channels table
    const { rows } = await pool.query(`
      SELECT id, name, category, ward, phone_number, invite_url
      FROM whatsapp_channels
      ORDER BY category ASC, name ASC
    `);

    console.log(`\n✓ Verification: Found ${rows.length} records in 'whatsapp_channels' on Neon DB:`);
    console.table(rows);

    console.log('\nAll Neon database migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed with error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
