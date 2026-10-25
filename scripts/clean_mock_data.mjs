import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "engineering_tracker.db");

if (!fs.existsSync(dbPath)) {
  console.log("No database file found at data/engineering_tracker.db. Nothing to clean.");
  process.exit(0);
}

try {
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = OFF;");

  const tables = [
    "consolidated_kits",
    "min_meetings",
    "label_uploads",
    "bom_records",
    "ecns",
    "rfqs",
    "revisions",
    "harnesses",
    "projects",
    "engineers",
    "customers"
  ];

  for (const t of tables) {
    try {
      db.exec(`DELETE FROM ${t};`);
      db.exec(`DELETE FROM sqlite_sequence WHERE name='${t}';`);
    } catch (e) {
      // Ignore if table doesn't exist
    }
  }

  db.exec("PRAGMA foreign_keys = ON;");
  db.close();

  console.log("\n========================================================");
  console.log("🧹 SUCCESS: All mock and dummy seed data wiped clean!");
  console.log("========================================================");
  console.log("Every table in data/engineering_tracker.db is now empty (0 rows).");
  console.log("You can now refresh the browser or enter your authentic engineering records.\n");
} catch (err) {
  console.error("❌ Error while clearing data:", err.message);
}
