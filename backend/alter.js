import { sql } from './src/config/db.js';
async function run() {
  try {
    await sql`ALTER TABLE transactions ADD COLUMN is_paid BOOLEAN DEFAULT true;`;
    console.log('success');
  } catch (e) {
    console.log(e.message);
  }
  process.exit(0);
}
run();
