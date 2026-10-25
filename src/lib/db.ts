import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = process.env.ENGINEERING_TRACKER_DB_URL || path.join(DATA_DIR, "engineering_tracker.db");

// Singleton connection
let dbInstance: DatabaseSync | null = null;

export function resetDbForTesting() {
  dbInstance = null;
}

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec("PRAGMA foreign_keys = ON;");
    initSchema(dbInstance);
  }
  return dbInstance;
}

export function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch {}
    dbInstance = null;
  }
}


function initSchema(db: DatabaseSync) {
  db.exec(`
    -- Master Customers
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL DEFAULT 'Engineer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      modified_by TEXT NOT NULL DEFAULT 'Engineer',
      modified_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Master Engineers
    CREATE TABLE IF NOT EXISTS engineers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_by TEXT NOT NULL DEFAULT 'Engineer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      modified_by TEXT NOT NULL DEFAULT 'Engineer',
      modified_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Projects (Model per Customer)
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
      model_name TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT 'Engineer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      modified_by TEXT NOT NULL DEFAULT 'Engineer',
      modified_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(customer_id, model_name)
    );

    -- Harnesses (Globally unique harness number)
    CREATE TABLE IF NOT EXISTS harnesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
      harness_number TEXT NOT NULL COLLATE NOCASE UNIQUE,
      created_by TEXT NOT NULL DEFAULT 'Engineer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      modified_by TEXT NOT NULL DEFAULT 'Engineer',
      modified_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Revisions (Per harness, only one active at a time)
    CREATE TABLE IF NOT EXISTS revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      harness_id INTEGER NOT NULL REFERENCES harnesses(id) ON DELETE RESTRICT,
      revision_code TEXT NOT NULL,
      sop_number TEXT NOT NULL,
      volume INTEGER NOT NULL DEFAULT 0,
      circuit_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Obsolete')),
      created_by TEXT NOT NULL DEFAULT 'Engineer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      modified_by TEXT NOT NULL DEFAULT 'Engineer',
      modified_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(harness_id, revision_code)
    );

    -- RFQs (Milestones, queries, proposals)
    CREATE TABLE IF NOT EXISTS rfqs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rfq_number TEXT NOT NULL UNIQUE,
      customer_name TEXT,
      sr_no TEXT,
      unique_rfq_no TEXT,
      drawing_number TEXT,
      model TEXT,
      engineer_id INTEGER REFERENCES engineers(id) ON DELETE SET NULL,
      engineer_name TEXT,
      harness_id INTEGER REFERENCES harnesses(id) ON DELETE SET NULL,
      revision_id INTEGER REFERENCES revisions(id) ON DELETE SET NULL,
      harness_part_no TEXT,
      customer_revision TEXT,
      fg_code TEXT,
      fg_rev TEXT,
      description TEXT,
      no_of_ckt INTEGER,
      volume INTEGER,
      marketing_input_date TEXT,
      design_input_date TEXT,
      work_start_date TEXT,
      target_date TEXT,
      completion_date TEXT,
      costing_bom_prepare_date TEXT,
      costing_bom_submitted_date TEXT,
      costing_bom_status TEXT NOT NULL DEFAULT 'Open',
      query_yes_no INTEGER NOT NULL DEFAULT 0,
      query_submitted_date TEXT,
      reply_received_date TEXT,
      query_type TEXT,
      query_status TEXT NOT NULL DEFAULT 'Open',
      query_remark TEXT,
      unique_list_share_date TEXT,
      unique_status TEXT NOT NULL DEFAULT 'Open',
      proposal_yes_no INTEGER NOT NULL DEFAULT 0,
      proposal_submitted_date TEXT,
      proposal_status TEXT NOT NULL DEFAULT 'Open',
      proposal_remark TEXT,
      remark TEXT,
      review_note TEXT,
      overall_rfq_status TEXT NOT NULL DEFAULT 'Open',
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL DEFAULT 'Engineer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      modified_by TEXT NOT NULL DEFAULT 'Engineer',
      modified_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- ECNs (Engineering Change Notes & Tracker Sheet)
    CREATE TABLE IF NOT EXISTS ecns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ecn_number TEXT NOT NULL UNIQUE,
      rfq_no TEXT,
      stage TEXT NOT NULL DEFAULT 'sample',
      customer_name TEXT,
      model_name TEXT,
      drawing_number TEXT,
      harness_part_number TEXT,
      customer_revision TEXT,
      fg_code TEXT,
      fg_rev TEXT,
      description TEXT,
      query_status TEXT NOT NULL DEFAULT 'Open',
      unique_list_share_date TEXT,
      unique_rfq_no TEXT,
      unique_status TEXT NOT NULL DEFAULT 'Open',
      sap_bom_alternate TEXT,
      sap_bom_upload_date TEXT,
      sap_bom_released_date TEXT,
      prd_bom_release_date TEXT,
      label_upload_date TEXT,
      min_by_engineer_date TEXT,
      min_by_ppc TEXT,
      min_status TEXT NOT NULL DEFAULT 'Open',
      review TEXT,
      overall_status TEXT NOT NULL DEFAULT 'Open',
      no_of_ckt INTEGER,
      volume INTEGER,
      work_start_date TEXT,
      target_date TEXT,
      completion_date TEXT,
      harness_id INTEGER REFERENCES harnesses(id) ON DELETE SET NULL,
      source_revision_id INTEGER REFERENCES revisions(id) ON DELETE SET NULL,
      stage_context TEXT DEFAULT 'Sample',
      development_type TEXT DEFAULT 'New Development',
      change_reason TEXT DEFAULT '',
      revision_impact TEXT DEFAULT 'Same Revision',
      new_revision_id INTEGER REFERENCES revisions(id) ON DELETE SET NULL,
      costing_required INTEGER NOT NULL DEFAULT 0,
      rfq_id INTEGER REFERENCES rfqs(id) ON DELETE SET NULL,
      primary_engineer_id INTEGER REFERENCES engineers(id) ON DELETE SET NULL,
      support_engineer_id INTEGER REFERENCES engineers(id) ON DELETE SET NULL,
      design_input_date TEXT,
      min_meeting_date TEXT,
      ecn_status TEXT NOT NULL DEFAULT 'Open',
      delay_reason TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL DEFAULT 'Engineer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      modified_by TEXT NOT NULL DEFAULT 'Engineer',
      modified_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- BOM Records (FG Code + Alternate)
    CREATE TABLE IF NOT EXISTS bom_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fg_code TEXT NOT NULL COLLATE NOCASE,
      bom_alternate TEXT NOT NULL,
      customer_part_number TEXT NOT NULL,
      customer_revision TEXT NOT NULL,
      fg_revision TEXT NOT NULL,
      ecn_id INTEGER NOT NULL REFERENCES ecns(id) ON DELETE RESTRICT,
      uploaded_by_id INTEGER NOT NULL REFERENCES engineers(id) ON DELETE RESTRICT,
      upload_date TEXT,
      release_date TEXT,
      created_by TEXT NOT NULL DEFAULT 'Engineer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      modified_by TEXT NOT NULL DEFAULT 'Engineer',
      modified_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(fg_code, bom_alternate)
    );

    -- Label Uploads (Multiple per released BOM)
    CREATE TABLE IF NOT EXISTS label_uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bom_id INTEGER NOT NULL REFERENCES bom_records(id) ON DELETE RESTRICT,
      fg_code TEXT NOT NULL,
      bom_alternate TEXT NOT NULL,
      uploaded_by_id INTEGER NOT NULL REFERENCES engineers(id) ON DELETE RESTRICT,
      upload_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT 'Engineer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      modified_by TEXT NOT NULL DEFAULT 'Engineer',
      modified_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- MIN Meetings (1:1 with ECN)
    CREATE TABLE IF NOT EXISTS min_meetings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ecn_id INTEGER NOT NULL UNIQUE REFERENCES ecns(id) ON DELETE RESTRICT,
      meeting_date TEXT NOT NULL,
      remarks TEXT,
      created_by TEXT NOT NULL DEFAULT 'Engineer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      modified_by TEXT NOT NULL DEFAULT 'Engineer',
      modified_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Consolidated Active Kit entries (Requires MIN completion)
    CREATE TABLE IF NOT EXISTS consolidated_kits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ecn_id INTEGER NOT NULL UNIQUE REFERENCES ecns(id) ON DELETE RESTRICT,
      rack_number TEXT,
      file_number TEXT,
      hard_copy_location TEXT,
      status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Obsolete')),
      created_by TEXT NOT NULL DEFAULT 'Engineer',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      modified_by TEXT NOT NULL DEFAULT 'Engineer',
      modified_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes for fast queries
    CREATE INDEX IF NOT EXISTS idx_projects_customer ON projects(customer_id);
    CREATE INDEX IF NOT EXISTS idx_harnesses_project ON harnesses(project_id);
    CREATE INDEX IF NOT EXISTS idx_revisions_harness ON revisions(harness_id);
    CREATE INDEX IF NOT EXISTS idx_rfqs_harness ON rfqs(harness_id);
    CREATE INDEX IF NOT EXISTS idx_ecns_harness ON ecns(harness_id);
    CREATE INDEX IF NOT EXISTS idx_bom_ecn ON bom_records(ecn_id);
    CREATE INDEX IF NOT EXISTS idx_label_bom ON label_uploads(bom_id);
  `);

  // Helper to ensure table columns exist safely on all existing databases
  const ensureCols = (tableName: string, cols: [string, string][]) => {
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
      const existing = new Set(tableInfo.map((c: any) => c.name));
      for (const [colName, colType] of cols) {
        if (!existing.has(colName)) {
          try {
            db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${colName} ${colType};`);
            existing.add(colName);
          } catch (e) {
            // Already added or non-fatal
          }
        }
      }
    } catch (e) {
      console.warn(`Notice: Could not check columns for ${tableName}:`, e);
    }
  };

  // Immediate, unconditional column insurance for rfqs
  ensureCols("rfqs", [
    ["drawing_number", "TEXT"],
    ["model", "TEXT"],
    ["harness_part_no", "TEXT"],
    ["customer_revision", "TEXT"],
    ["fg_code", "TEXT"],
    ["fg_rev", "TEXT"],
    ["description", "TEXT"],
    ["query_type", "TEXT"],
    ["unique_list_share_date", "TEXT"],
    ["unique_status", "TEXT NOT NULL DEFAULT 'Open'"],
    ["costing_bom_prepare_date", "TEXT"],
    ["costing_bom_status", "TEXT NOT NULL DEFAULT 'Open'"],
    ["remark", "TEXT"],
    ["sr_no", "TEXT"],
    ["unique_rfq_no", "TEXT"],
    ["no_of_ckt", "INTEGER"],
    ["volume", "INTEGER"],
    ["is_deleted", "INTEGER NOT NULL DEFAULT 0"],
    ["engineer_id", "INTEGER"],
    ["engineer_name", "TEXT"],
    ["customer_name", "TEXT"],
    ["review_note", "TEXT"]
  ]);

  // Immediate, unconditional column insurance for ecns
  ensureCols("ecns", [
    ["rfq_no", "TEXT"],
    ["stage", "TEXT NOT NULL DEFAULT 'sample'"],
    ["customer_name", "TEXT"],
    ["model_name", "TEXT"],
    ["query_status", "TEXT NOT NULL DEFAULT 'Open'"],
    ["unique_list_share_date", "TEXT"],
    ["unique_rfq_no", "TEXT"],
    ["unique_status", "TEXT NOT NULL DEFAULT 'Open'"],
    ["sap_bom_upload_date", "TEXT"],
    ["sap_bom_released_date", "TEXT"],
    ["prd_bom_release_date", "TEXT"],
    ["label_upload_date", "TEXT"],
    ["min_by_engineer_date", "TEXT"],
    ["min_by_ppc", "TEXT"],
    ["min_status", "TEXT NOT NULL DEFAULT 'Open'"],
    ["review", "TEXT"],
    ["overall_status", "TEXT NOT NULL DEFAULT 'Open'"],
    ["no_of_ckt", "INTEGER"],
    ["volume", "INTEGER"],
    ["is_deleted", "INTEGER NOT NULL DEFAULT 0"],
    ["work_start_date", "TEXT"],
    ["target_date", "TEXT"],
    ["completion_date", "TEXT"],
    ["delay_reason", "TEXT"]
  ]);

  // Safe dynamic migration for existing rfqs table
  try {
    const rfqCols = db.prepare("PRAGMA table_info(rfqs)").all() as any[];
    const harnessCol = rfqCols.find((c: any) => c.name === "harness_id");
    if (harnessCol && harnessCol.notnull === 1) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE IF NOT EXISTS rfqs_mig_temp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rfq_number TEXT NOT NULL UNIQUE,
        sr_no TEXT,
        unique_rfq_no TEXT,
        harness_id INTEGER REFERENCES harnesses(id) ON DELETE SET NULL,
        revision_id INTEGER REFERENCES revisions(id) ON DELETE SET NULL,
        harness_part_no TEXT,
        customer_revision TEXT,
        fg_code TEXT,
        fg_rev TEXT,
        description TEXT,
        no_of_ckt INTEGER,
        volume INTEGER,
        marketing_input_date TEXT,
        design_input_date TEXT,
        work_start_date TEXT,
        target_date TEXT,
        completion_date TEXT,
        costing_bom_prepare_date TEXT,
        costing_bom_submitted_date TEXT,
        costing_bom_status TEXT NOT NULL DEFAULT 'Pending',
        query_yes_no INTEGER NOT NULL DEFAULT 0,
        query_submitted_date TEXT,
        reply_received_date TEXT,
        query_type TEXT,
        query_status TEXT NOT NULL DEFAULT 'Open' CHECK(query_status IN ('Open', 'Resolved', 'Cancelled')),
        query_remark TEXT,
        unique_list_share_date TEXT,
        unique_status TEXT NOT NULL DEFAULT 'Open',
        proposal_yes_no INTEGER NOT NULL DEFAULT 0,
        proposal_submitted_date TEXT,
        proposal_status TEXT NOT NULL DEFAULT 'Pending' CHECK(proposal_status IN ('Pending', 'Submitted', 'Approved', 'Rejected')),
        proposal_remark TEXT,
        remark TEXT,
        overall_rfq_status TEXT NOT NULL DEFAULT 'Open' CHECK(overall_rfq_status IN ('Open', 'In Progress', 'Submitted', 'Completed', 'Cancelled')),
        created_by TEXT NOT NULL DEFAULT 'Engineer',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        modified_by TEXT NOT NULL DEFAULT 'Engineer',
        modified_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO rfqs_mig_temp (
        id, rfq_number, sr_no, unique_rfq_no, harness_id, revision_id,
        fg_code, fg_rev, description, no_of_ckt, volume,
        marketing_input_date, design_input_date, work_start_date, target_date, completion_date,
        costing_bom_prepare_date, costing_bom_submitted_date, costing_bom_status,
        query_yes_no, query_submitted_date, reply_received_date, query_type, query_status, query_remark,
        unique_list_share_date, unique_status, proposal_yes_no, proposal_submitted_date, proposal_status, proposal_remark,
        remark, overall_rfq_status, created_by, created_at, modified_by, modified_at
      )
      SELECT 
        id, rfq_number, sr_no, unique_rfq_no, harness_id, revision_id,
        fg_code, fg_rev, description, no_of_ckt, volume,
        marketing_input_date, design_input_date, work_start_date, target_date, completion_date,
        costing_bom_prepare_date, costing_bom_submitted_date, costing_bom_status,
        query_yes_no, query_submitted_date, reply_received_date, query_type, query_status, query_remark,
        unique_list_share_date, unique_status, proposal_yes_no, proposal_submitted_date, proposal_status, proposal_remark,
        remark, overall_rfq_status, created_by, created_at, modified_by, modified_at
      FROM rfqs;
      DROP TABLE rfqs;
      ALTER TABLE rfqs_mig_temp RENAME TO rfqs;
      PRAGMA foreign_keys = ON;
    `);
    }
  } catch (err) {
    console.warn("Notice: rfqs migration skipped:", err);
  }

  // Remove restrictive CHECK constraints on rfqs status fields if present
  try {
    const rfqMaster = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='rfqs'").get() as any;
    if (rfqMaster && rfqMaster.sql && rfqMaster.sql.includes("CHECK(query_status")) {
    db.exec(`
      PRAGMA foreign_keys = OFF;
      CREATE TABLE IF NOT EXISTS rfqs_mig_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rfq_number TEXT NOT NULL UNIQUE,
        sr_no TEXT,
        unique_rfq_no TEXT,
        drawing_number TEXT,
        model TEXT,
        harness_id INTEGER REFERENCES harnesses(id) ON DELETE SET NULL,
        revision_id INTEGER REFERENCES revisions(id) ON DELETE SET NULL,
        harness_part_no TEXT,
        customer_revision TEXT,
        fg_code TEXT,
        fg_rev TEXT,
        description TEXT,
        no_of_ckt INTEGER,
        volume INTEGER,
        marketing_input_date TEXT,
        design_input_date TEXT,
        work_start_date TEXT,
        target_date TEXT,
        completion_date TEXT,
        costing_bom_prepare_date TEXT,
        costing_bom_submitted_date TEXT,
        costing_bom_status TEXT NOT NULL DEFAULT 'Open',
        query_yes_no INTEGER NOT NULL DEFAULT 0,
        query_submitted_date TEXT,
        reply_received_date TEXT,
        query_type TEXT,
        query_status TEXT NOT NULL DEFAULT 'Open',
        query_remark TEXT,
        unique_list_share_date TEXT,
        unique_status TEXT NOT NULL DEFAULT 'Open',
        proposal_yes_no INTEGER NOT NULL DEFAULT 0,
        proposal_submitted_date TEXT,
        proposal_status TEXT NOT NULL DEFAULT 'Open',
        proposal_remark TEXT,
        remark TEXT,
        overall_rfq_status TEXT NOT NULL DEFAULT 'Open',
        created_by TEXT NOT NULL DEFAULT 'Engineer',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        modified_by TEXT NOT NULL DEFAULT 'Engineer',
        modified_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO rfqs_mig_status (
        id, rfq_number, sr_no, unique_rfq_no, harness_id, revision_id,
        harness_part_no, customer_revision, fg_code, fg_rev, description,
        no_of_ckt, volume, marketing_input_date, design_input_date, work_start_date,
        target_date, completion_date, costing_bom_prepare_date, costing_bom_submitted_date, costing_bom_status,
        query_yes_no, query_submitted_date, reply_received_date, query_type, query_status, query_remark,
        unique_list_share_date, unique_status, proposal_yes_no, proposal_submitted_date, proposal_status, proposal_remark,
        remark, overall_rfq_status, created_by, created_at, modified_by, modified_at
      )
      SELECT 
        id, rfq_number, sr_no, unique_rfq_no, harness_id, revision_id,
        harness_part_no, customer_revision, fg_code, fg_rev, description,
        no_of_ckt, volume, marketing_input_date, design_input_date, work_start_date,
        target_date, completion_date, costing_bom_prepare_date, costing_bom_submitted_date, costing_bom_status,
        query_yes_no, query_submitted_date, reply_received_date, query_type, query_status, query_remark,
        unique_list_share_date, unique_status, proposal_yes_no, proposal_submitted_date, proposal_status, proposal_remark,
        remark, overall_rfq_status, created_by, created_at, modified_by, modified_at
      FROM rfqs;
      DROP TABLE rfqs;
      ALTER TABLE rfqs_mig_status RENAME TO rfqs;
      PRAGMA foreign_keys = ON;
    `);
    }
  } catch (err) {
    console.warn("Notice: rfqs status migration skipped:", err);
  }

  const updatedCols = db.prepare("PRAGMA table_info(rfqs)").all() as any[];
  const colSet = new Set(updatedCols.map((c: any) => c.name));
  const addColIfNotExists = (col: string, type: string) => {
    if (!colSet.has(col)) {
      db.exec(`ALTER TABLE rfqs ADD COLUMN ${col} ${type};`);
    }
  };
  addColIfNotExists("drawing_number", "TEXT");
  addColIfNotExists("model", "TEXT");
  addColIfNotExists("harness_part_no", "TEXT");
  addColIfNotExists("customer_revision", "TEXT");
  addColIfNotExists("fg_code", "TEXT");
  addColIfNotExists("fg_rev", "TEXT");
  addColIfNotExists("description", "TEXT");
  addColIfNotExists("query_type", "TEXT");
  addColIfNotExists("unique_list_share_date", "TEXT");
  addColIfNotExists("unique_status", "TEXT NOT NULL DEFAULT 'Open'");
  addColIfNotExists("costing_bom_prepare_date", "TEXT");
  addColIfNotExists("costing_bom_status", "TEXT NOT NULL DEFAULT 'Open'");
  addColIfNotExists("remark", "TEXT");
  addColIfNotExists("sr_no", "TEXT");
  addColIfNotExists("unique_rfq_no", "TEXT");
  addColIfNotExists("no_of_ckt", "INTEGER");
  addColIfNotExists("volume", "INTEGER");
  addColIfNotExists("is_deleted", "INTEGER NOT NULL DEFAULT 0");
  addColIfNotExists("engineer_id", "INTEGER");
  addColIfNotExists("engineer_name", "TEXT");
  addColIfNotExists("customer_name", "TEXT");
  addColIfNotExists("review_note", "TEXT");

  // Auto-sync overall_rfq_status for all records in the database based on milestone columns
  try {
    db.exec(`
      UPDATE rfqs 
      SET overall_rfq_status = 'Close' 
      WHERE LOWER(TRIM(COALESCE(query_status, ''))) IN ('close', 'closed') 
        AND LOWER(TRIM(COALESCE(unique_status, ''))) IN ('close', 'closed') 
        AND LOWER(TRIM(COALESCE(costing_bom_status, ''))) IN ('close', 'closed')
        AND overall_rfq_status != 'Close';

      UPDATE rfqs 
      SET overall_rfq_status = 'Open' 
      WHERE (LOWER(TRIM(COALESCE(query_status, ''))) NOT IN ('close', 'closed') 
          OR LOWER(TRIM(COALESCE(unique_status, ''))) NOT IN ('close', 'closed') 
          OR LOWER(TRIM(COALESCE(costing_bom_status, ''))) NOT IN ('close', 'closed'))
        AND overall_rfq_status IN ('Close', 'Submitted', 'In Progress');
    `);
  } catch (err) {
    console.warn("Notice: could not auto-sync rfq statuses:", err);
  }

  // Safe dynamic migration for existing ecns table if it has restrictive NOT NULL / CHECK constraints
  try {
    const ecnCols = db.prepare("PRAGMA table_info(ecns)").all() as any[];
    const ecnHarnessCol = ecnCols.find((c: any) => c.name === "harness_id");
    const ecnChangeReasonCol = ecnCols.find((c: any) => c.name === "change_reason");
    const ecnMaster = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='ecns'").get() as any;
    const hasStrictEcnConstraints = (ecnHarnessCol && ecnHarnessCol.notnull === 1) || 
      (ecnChangeReasonCol && ecnChangeReasonCol.notnull === 1) || 
      (ecnMaster && ecnMaster.sql && (ecnMaster.sql.includes("CHECK(stage_context") || ecnMaster.sql.includes("CHECK(ecn_status")));

    if (hasStrictEcnConstraints) {
      db.exec(`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE IF NOT EXISTS ecns_mig_temp (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ecn_number TEXT NOT NULL UNIQUE,
          rfq_no TEXT,
          stage TEXT NOT NULL DEFAULT 'sample',
          customer_name TEXT,
          model_name TEXT,
          query_status TEXT NOT NULL DEFAULT 'Open',
          unique_list_share_date TEXT,
          unique_rfq_no TEXT,
          unique_status TEXT NOT NULL DEFAULT 'Open',
          sap_bom_upload_date TEXT,
          sap_bom_released_date TEXT,
          prd_bom_release_date TEXT,
          label_upload_date TEXT,
          min_by_engineer_date TEXT,
          min_by_ppc TEXT,
          min_status TEXT NOT NULL DEFAULT 'Open',
          review TEXT,
          overall_status TEXT NOT NULL DEFAULT 'Open',
          no_of_ckt INTEGER,
          volume INTEGER,
          work_start_date TEXT,
          target_date TEXT,
          completion_date TEXT,
          harness_id INTEGER REFERENCES harnesses(id) ON DELETE SET NULL,
          source_revision_id INTEGER REFERENCES revisions(id) ON DELETE SET NULL,
          stage_context TEXT DEFAULT 'Sample',
          development_type TEXT DEFAULT 'New Development',
          change_reason TEXT DEFAULT '',
          revision_impact TEXT DEFAULT 'Same Revision',
          new_revision_id INTEGER REFERENCES revisions(id) ON DELETE SET NULL,
          costing_required INTEGER NOT NULL DEFAULT 0,
          rfq_id INTEGER REFERENCES rfqs(id) ON DELETE SET NULL,
          primary_engineer_id INTEGER REFERENCES engineers(id) ON DELETE SET NULL,
          support_engineer_id INTEGER REFERENCES engineers(id) ON DELETE SET NULL,
          design_input_date TEXT,
          min_meeting_date TEXT,
          ecn_status TEXT NOT NULL DEFAULT 'Open',
          delay_reason TEXT,
          is_deleted INTEGER NOT NULL DEFAULT 0,
          created_by TEXT NOT NULL DEFAULT 'Engineer',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          modified_by TEXT NOT NULL DEFAULT 'Engineer',
          modified_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
        INSERT INTO ecns_mig_temp (
          id, ecn_number, harness_id, source_revision_id, stage_context, development_type,
          change_reason, revision_impact, new_revision_id, costing_required, rfq_id,
          primary_engineer_id, support_engineer_id, design_input_date, work_start_date,
          target_date, min_meeting_date, completion_date, ecn_status, delay_reason,
          created_by, created_at, modified_by, modified_at
        )
        SELECT 
          id, ecn_number, harness_id, source_revision_id, stage_context, development_type,
          change_reason, revision_impact, new_revision_id, costing_required, rfq_id,
          primary_engineer_id, support_engineer_id, design_input_date, work_start_date,
          target_date, min_meeting_date, completion_date, ecn_status, delay_reason,
          created_by, created_at, modified_by, modified_at
        FROM ecns;
        DROP TABLE ecns;
        ALTER TABLE ecns_mig_temp RENAME TO ecns;
        PRAGMA foreign_keys = ON;
      `);
    }
  } catch (err) {
    console.warn("Notice: ecns constraint migration skipped:", err);
  }

  // Ensure all columns exist on ecns
  const updatedEcnCols = db.prepare("PRAGMA table_info(ecns)").all() as any[];
  const ecnColSet = new Set(updatedEcnCols.map((c: any) => c.name));
  const addEcnCol = (col: string, type: string) => {
    if (!ecnColSet.has(col)) {
      db.exec(`ALTER TABLE ecns ADD COLUMN ${col} ${type};`);
    }
  };
  addEcnCol("rfq_no", "TEXT");
  addEcnCol("stage", "TEXT NOT NULL DEFAULT 'sample'");
  addEcnCol("customer_name", "TEXT");
  addEcnCol("model_name", "TEXT");
  addEcnCol("drawing_number", "TEXT");
  addEcnCol("harness_part_number", "TEXT");
  addEcnCol("customer_revision", "TEXT");
  addEcnCol("fg_code", "TEXT");
  addEcnCol("fg_rev", "TEXT");
  addEcnCol("description", "TEXT");
  addEcnCol("query_status", "TEXT NOT NULL DEFAULT 'Open'");
  addEcnCol("unique_list_share_date", "TEXT");
  addEcnCol("unique_rfq_no", "TEXT");
  addEcnCol("unique_status", "TEXT NOT NULL DEFAULT 'Open'");
  addEcnCol("sap_bom_alternate", "TEXT");
  addEcnCol("sap_bom_upload_date", "TEXT");
  addEcnCol("sap_bom_released_date", "TEXT");
  addEcnCol("prd_bom_release_date", "TEXT");
  addEcnCol("label_upload_date", "TEXT");
  addEcnCol("min_by_engineer_date", "TEXT");
  addEcnCol("min_by_ppc", "TEXT");
  addEcnCol("min_status", "TEXT NOT NULL DEFAULT 'Open'");
  addEcnCol("review", "TEXT");
  addEcnCol("overall_status", "TEXT NOT NULL DEFAULT 'Open'");
  addEcnCol("no_of_ckt", "INTEGER");
  addEcnCol("volume", "INTEGER");
  addEcnCol("is_deleted", "INTEGER NOT NULL DEFAULT 0");

  // Sync existing customer_name, model_name, rfq_no, and RFQ fields for existing ECNs
  try {
    db.exec(`
      UPDATE ecns
      SET customer_name = (
        SELECT c.name FROM harnesses h 
        JOIN projects p ON h.project_id = p.id 
        JOIN customers c ON p.customer_id = c.id 
        WHERE h.id = ecns.harness_id
      )
      WHERE (customer_name IS NULL OR customer_name = '') AND harness_id IS NOT NULL;

      UPDATE ecns
      SET model_name = (
        SELECT p.model_name FROM harnesses h 
        JOIN projects p ON h.project_id = p.id 
        WHERE h.id = ecns.harness_id
      )
      WHERE (model_name IS NULL OR model_name = '') AND harness_id IS NOT NULL;

      UPDATE ecns
      SET rfq_no = (
        SELECT COALESCE(r.sr_no, r.rfq_number) FROM rfqs r WHERE r.id = ecns.rfq_id
      )
      WHERE (rfq_no IS NULL OR rfq_no = '') AND rfq_id IS NOT NULL;

      UPDATE ecns
      SET 
        drawing_number = COALESCE(drawing_number, (SELECT r.drawing_number FROM rfqs r WHERE r.id = ecns.rfq_id OR (COALESCE(r.sr_no, r.rfq_number) = ecns.rfq_no AND ecns.rfq_no IS NOT NULL AND ecns.rfq_no != ''))),
        harness_part_number = COALESCE(harness_part_number, (SELECT COALESCE(r.harness_part_no, '') FROM rfqs r WHERE r.id = ecns.rfq_id OR (COALESCE(r.sr_no, r.rfq_number) = ecns.rfq_no AND ecns.rfq_no IS NOT NULL AND ecns.rfq_no != ''))),
        customer_revision = COALESCE(customer_revision, (SELECT COALESCE(r.customer_revision, '') FROM rfqs r WHERE r.id = ecns.rfq_id OR (COALESCE(r.sr_no, r.rfq_number) = ecns.rfq_no AND ecns.rfq_no IS NOT NULL AND ecns.rfq_no != ''))),
        fg_code = COALESCE(fg_code, (SELECT COALESCE(r.fg_code, '') FROM rfqs r WHERE r.id = ecns.rfq_id OR (COALESCE(r.sr_no, r.rfq_number) = ecns.rfq_no AND ecns.rfq_no IS NOT NULL AND ecns.rfq_no != ''))),
        fg_rev = COALESCE(fg_rev, (SELECT COALESCE(r.fg_rev, '') FROM rfqs r WHERE r.id = ecns.rfq_id OR (COALESCE(r.sr_no, r.rfq_number) = ecns.rfq_no AND ecns.rfq_no IS NOT NULL AND ecns.rfq_no != ''))),
        description = COALESCE(description, (SELECT COALESCE(r.description, '') FROM rfqs r WHERE r.id = ecns.rfq_id OR (COALESCE(r.sr_no, r.rfq_number) = ecns.rfq_no AND ecns.rfq_no IS NOT NULL AND ecns.rfq_no != '')))
      WHERE rfq_id IS NOT NULL OR (rfq_no IS NOT NULL AND rfq_no != '');
    `);
  } catch (err) {
    console.warn("Notice: could not auto-sync ecn metadata:", err);
  }
}
