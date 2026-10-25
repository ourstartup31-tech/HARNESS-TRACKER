import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "engineering_tracker.db");

// Attempt clean reset if file is not locked
let fileReplaced = false;
if (fs.existsSync(dbPath)) {
  try {
    fs.unlinkSync(dbPath);
    fileReplaced = true;
    console.log("🗑️  Cleanly deleted outdated SQLite database file.");
  } catch (err) {
    console.log("ℹ️  Database file is in use by running dev server; applying live in-place schema migration instead.");
  }
}

// Initialize database with latest schema and column insurance
const { getDb, closeDb } = await import("../src/lib/db.ts");
const db = getDb();

// If in-place migration, ensure all tables are wiped of stale test records if requested
if (!fileReplaced && process.argv.includes("--clean")) {
  try {
    db.exec(`
      DELETE FROM consolidated_kits;
      DELETE FROM min_meetings;
      DELETE FROM label_uploads;
      DELETE FROM bom_records;
      DELETE FROM ecns;
      DELETE FROM rfqs;
      DELETE FROM revisions;
      DELETE FROM harnesses;
      DELETE FROM projects;
      DELETE FROM engineers;
      DELETE FROM customers;
    `);
    console.log("🧹 Cleared all stale records from database tables.");
  } catch (err) {
    console.warn("Notice during table clear:", err.message);
  }
}

const rfqCols = db.prepare("PRAGMA table_info(rfqs)").all().map((c) => c.name);
const ecnCols = db.prepare("PRAGMA table_info(ecns)").all().map((c) => c.name);

console.log("\n========================================================");
console.log("✅ SQLite Database Synced with Latest Engineering Schema!");
console.log("========================================================");
console.log(`📁 File: ${dbPath}`);
console.log(`📋 rfqs Table: ${rfqCols.length} columns`);
console.log(`   - 'customer_name' present: ${rfqCols.includes("customer_name") ? "✅ YES" : "❌ NO"}`);
console.log(`   - 'review_note' present:   ${rfqCols.includes("review_note") ? "✅ YES" : "❌ NO"}`);
console.log(`   - 'drawing_number' present:${rfqCols.includes("drawing_number") ? "✅ YES" : "❌ NO"}`);
console.log(`📋 ecns Table: ${ecnCols.length} columns`);
console.log(`   - 'rfq_no' present:        ${ecnCols.includes("rfq_no") ? "✅ YES" : "❌ NO"}`);
console.log(`   - 'stage' present:         ${ecnCols.includes("stage") ? "✅ YES" : "❌ NO"}`);
console.log(`   - 'customer_name' present: ${ecnCols.includes("customer_name") ? "✅ YES" : "❌ NO"}`);
console.log("========================================================\n");

closeDb();
