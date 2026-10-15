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
    seedInitialData(dbInstance);
  }
  return dbInstance;
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
      harness_id INTEGER NOT NULL REFERENCES harnesses(id) ON DELETE RESTRICT,
      revision_id INTEGER NOT NULL REFERENCES revisions(id) ON DELETE RESTRICT,
      fg_code TEXT,
      fg_rev TEXT,
      description TEXT,
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

    -- ECNs (Engineering Change Notes)
    CREATE TABLE IF NOT EXISTS ecns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ecn_number TEXT NOT NULL UNIQUE,
      harness_id INTEGER NOT NULL REFERENCES harnesses(id) ON DELETE RESTRICT,
      source_revision_id INTEGER NOT NULL REFERENCES revisions(id) ON DELETE RESTRICT,
      stage_context TEXT NOT NULL DEFAULT 'Sample' CHECK(stage_context IN ('Sample', 'Production')),
      development_type TEXT NOT NULL DEFAULT 'New Development' CHECK(development_type IN ('New Development', 'Productized')),
      change_reason TEXT NOT NULL,
      revision_impact TEXT NOT NULL DEFAULT 'Same Revision' CHECK(revision_impact IN ('New Revision', 'Same Revision')),
      new_revision_id INTEGER REFERENCES revisions(id) ON DELETE RESTRICT,
      costing_required INTEGER NOT NULL DEFAULT 0,
      rfq_id INTEGER REFERENCES rfqs(id) ON DELETE RESTRICT,
      primary_engineer_id INTEGER NOT NULL REFERENCES engineers(id) ON DELETE RESTRICT,
      support_engineer_id INTEGER REFERENCES engineers(id) ON DELETE RESTRICT,
      design_input_date TEXT,
      work_start_date TEXT,
      target_date TEXT NOT NULL,
      min_meeting_date TEXT,
      completion_date TEXT,
      ecn_status TEXT NOT NULL DEFAULT 'In Progress' CHECK(ecn_status IN ('Draft', 'In Progress', 'Under Review', 'Completed', 'Cancelled')),
      delay_reason TEXT,
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

  // Safe dynamic migration for existing rfqs table
  const rfqCols = db.prepare("PRAGMA table_info(rfqs)").all() as any[];
  const colSet = new Set(rfqCols.map((c: any) => c.name));
  const addColIfNotExists = (col: string, type: string) => {
    if (!colSet.has(col)) {
      db.exec(`ALTER TABLE rfqs ADD COLUMN ${col} ${type};`);
    }
  };
  addColIfNotExists("fg_code", "TEXT");
  addColIfNotExists("fg_rev", "TEXT");
  addColIfNotExists("description", "TEXT");
  addColIfNotExists("query_type", "TEXT");
  addColIfNotExists("unique_list_share_date", "TEXT");
  addColIfNotExists("unique_status", "TEXT NOT NULL DEFAULT 'Open'");
  addColIfNotExists("costing_bom_prepare_date", "TEXT");
  addColIfNotExists("costing_bom_status", "TEXT NOT NULL DEFAULT 'Pending'");
  addColIfNotExists("remark", "TEXT");
}

function seedInitialData(db: DatabaseSync) {
  const row = db.prepare("SELECT COUNT(*) as count FROM customers").get() as { count: number };
  if (row.count > 0) return;

  // 1. Customers
  db.exec(`
    INSERT INTO customers (name) VALUES 
      ('Tata Motors'),
      ('Mahindra & Mahindra'),
      ('Maruti Suzuki'),
      ('Stellantis');
    
    INSERT INTO engineers (name) VALUES
      ('Rajesh Sharma'),
      ('Priya Nair'),
      ('Amit Verma'),
      ('Kavita Iyer'),
      ('Marcus Vance');

    -- Projects
    INSERT INTO projects (customer_id, model_name) VALUES
      (1, 'Nexon-EV'),
      (1, 'Curvv-EV'),
      (2, 'Scorpio-N'),
      (3, 'Brezza'),
      (4, 'Compass-2027');

    -- Harnesses
    INSERT INTO harnesses (project_id, harness_number) VALUES
      (1, 'HARN-NXN-MAIN-01'),
      (1, 'HARN-NXN-DOOR-01'),
      (3, 'HARN-SCP-ENG-01'),
      (4, 'HARN-BRZ-FLOOR-01'),
      (5, 'HARN-CMP-01');

    -- Revisions
    INSERT INTO revisions (harness_id, revision_code, sop_number, volume, circuit_count, status) VALUES
      (1, 'A', 'SOP-NXN-001', 12000, 84, 'Obsolete'),
      (1, 'B', 'SOP-NXN-002', 14500, 88, 'Active'),
      (2, 'A', 'SOP-NXN-003', 12000, 18, 'Active'),
      (3, '01', 'SOP-SCP-101', 8000, 110, 'Active'),
      (4, '01', 'SOP-BRZ-01', 12000, 45, 'Active'),
      (5, 'A', 'SOP-CMP-01', 5000, 30, 'Active');

    -- RFQs
    INSERT INTO rfqs (
      rfq_number, harness_id, revision_id, marketing_input_date, design_input_date,
      work_start_date, target_date, costing_bom_submitted_date,
      query_yes_no, query_submitted_date, reply_received_date, query_status, query_remark,
      proposal_yes_no, proposal_submitted_date, proposal_status, overall_rfq_status
    ) VALUES (
      'RFQ-2026-0001', 1, 2, '2026-01-10', '2026-01-12', '2026-01-15', '2026-01-25', '2026-01-26',
      1, '2026-01-18', '2026-01-20', 'Resolved', 'Terminal plating confirmed with marketing.',
      1, '2026-01-28', 'Submitted', 'Submitted'
    ), (
      'RFQ-2026-0002', 3, 4, '2026-02-01', '2026-02-03', '2026-02-05', '2026-02-20', NULL,
      0, NULL, NULL, 'Open', NULL,
      0, NULL, 'Pending', 'In Progress'
    );

    -- ECNs
    INSERT INTO ecns (
      ecn_number, harness_id, source_revision_id, stage_context, development_type,
      change_reason, revision_impact, new_revision_id, costing_required, rfq_id,
      primary_engineer_id, support_engineer_id, design_input_date, work_start_date,
      target_date, min_meeting_date, completion_date, ecn_status, delay_reason
    ) VALUES (
      'ECN-2026-0001', 1, 1, 'Production', 'New Development',
      'Add DC fast-charging sensor junction and increase high-voltage grounding gauge.',
      'New Revision', 2, 1, 1,
      1, 2, '2026-01-12', '2026-01-16',
      '2026-02-02', '2026-02-05', '2026-02-05', 'Completed',
      'Awaiting customer fast-charger mating connector sample.'
    ), (
      'ECN-2026-0002', 3, 4, 'Sample', 'New Development',
      'Initial sample harness prototype layout and fuse box pinouts.',
      'Same Revision', NULL, 0, NULL,
      3, 4, '2026-02-05', '2026-02-10',
      '2026-02-28', NULL, NULL, 'In Progress',
      NULL
    );

    -- BOM Records
    INSERT INTO bom_records (
      fg_code, bom_alternate, customer_part_number, customer_revision, fg_revision,
      ecn_id, uploaded_by_id, upload_date, release_date
    ) VALUES (
      'FG-NXN-MAIN-901', '01', '28400-NXN-0100', 'B', 'BA',
      1, 1, '2026-01-30', '2026-02-02'
    );

    -- Label Upload
    INSERT INTO label_uploads (
      bom_id, fg_code, bom_alternate, uploaded_by_id, upload_date, reason
    ) VALUES (
      1, 'FG-NXN-MAIN-901', '01', 1, '2026-02-04', 'Initial high-temp adhesive bar code label approved.'
    );

    -- MIN Meeting
    INSERT INTO min_meetings (ecn_id, meeting_date, remarks) VALUES
      (1, '2026-02-05', 'All 88 circuits verified and approved for sample build.');

    -- Consolidated Kit Entry
    INSERT INTO consolidated_kits (
      ecn_id, rack_number, file_number, hard_copy_location, status
    ) VALUES (
      1, 'RACK-EV-02', 'FILE-NXN-88', 'Master Archive Cabinets, Tier 3', 'Active'
    );
  `);
}
