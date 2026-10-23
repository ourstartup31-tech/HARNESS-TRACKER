import { getDb } from "./db";

// Helper for date calculations in calendar days
export function daysBetween(d1Str?: string | null, d2Str?: string | null): number | null {
  if (!d1Str || !d2Str) return null;
  const d1 = new Date(d1Str);
  const d2 = new Date(d2Str);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  const diffTime = d1.getTime() - d2.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// -------------------------------------------------------------
// 1. MASTER DATA SERVICES
// -------------------------------------------------------------
export const CustomerService = {
  list(activeOnly = false) {
    const db = getDb();
    const sql = activeOnly
      ? "SELECT * FROM customers WHERE is_active = 1 ORDER BY name ASC"
      : "SELECT * FROM customers ORDER BY name ASC";
    return db.prepare(sql).all();
  },

  create(name: string, createdBy = "Engineer") {
    const clean = (name || "").trim();
    if (!clean) throw new Error("Customer name must be provided.");

    const db = getDb();
    const existing = db.prepare("SELECT id FROM customers WHERE LOWER(name) = LOWER(?)").get(clean);
    if (existing) throw new Error(`Customer '${clean}' already exists.`);

    const info = db.prepare("INSERT INTO customers (name, created_by, modified_by) VALUES (?, ?, ?)")
      .run(clean, createdBy, createdBy);
    return db.prepare("SELECT * FROM customers WHERE id = ?").get(info.lastInsertRowid);
  },

  setActive(id: number, isActive: boolean, modifiedBy = "Engineer") {
    const db = getDb();
    db.prepare("UPDATE customers SET is_active = ?, modified_by = ?, modified_at = datetime('now') WHERE id = ?")
      .run(isActive ? 1 : 0, modifiedBy, id);
    return db.prepare("SELECT * FROM customers WHERE id = ?").get(id);
  }
};

export const EngineerService = {
  list(activeOnly = false) {
    const db = getDb();
    const sql = activeOnly
      ? "SELECT * FROM engineers WHERE is_active = 1 ORDER BY name ASC"
      : "SELECT * FROM engineers ORDER BY name ASC";
    return db.prepare(sql).all();
  },

  create(name: string, createdBy = "Engineer") {
    const clean = (name || "").trim();
    if (!clean) throw new Error("Engineer name must be provided.");

    const db = getDb();
    const existing = db.prepare("SELECT id FROM engineers WHERE LOWER(name) = LOWER(?)").get(clean);
    if (existing) throw new Error(`Engineer '${clean}' already exists.`);

    const info = db.prepare("INSERT INTO engineers (name, created_by, modified_by) VALUES (?, ?, ?)")
      .run(clean, createdBy, createdBy);
    return db.prepare("SELECT * FROM engineers WHERE id = ?").get(info.lastInsertRowid);
  },

  setActive(id: number, isActive: boolean, modifiedBy = "Engineer") {
    const db = getDb();
    db.prepare("UPDATE engineers SET is_active = ?, modified_by = ?, modified_at = datetime('now') WHERE id = ?")
      .run(isActive ? 1 : 0, modifiedBy, id);
    return db.prepare("SELECT * FROM engineers WHERE id = ?").get(id);
  }
};

export const ProjectService = {
  list() {
    const db = getDb();
    return db.prepare(`
      SELECT p.*, c.name as customer_name
      FROM projects p
      JOIN customers c ON p.customer_id = c.id
      ORDER BY c.name ASC, p.model_name ASC
    `).all();
  },

  getOrCreate(customerId: number, modelName: string, createdBy = "Engineer") {
    const clean = (modelName || "").trim();
    if (!clean) throw new Error("Model name must be provided.");

    const db = getDb();
    const existing = db.prepare(
      "SELECT * FROM projects WHERE customer_id = ? AND LOWER(model_name) = LOWER(?)"
    ).get(customerId, clean);
    if (existing) return existing;

    const info = db.prepare(
      "INSERT INTO projects (customer_id, model_name, created_by, modified_by) VALUES (?, ?, ?, ?)"
    ).run(customerId, clean, createdBy, createdBy);
    return db.prepare("SELECT * FROM projects WHERE id = ?").get(info.lastInsertRowid);
  }
};

export const HarnessService = {
  list(projectId?: number) {
    const db = getDb();
    const sql = projectId
      ? `SELECT h.*, p.model_name, c.name as customer_name 
         FROM harnesses h 
         JOIN projects p ON h.project_id = p.id 
         JOIN customers c ON p.customer_id = c.id 
         WHERE h.project_id = ? 
         ORDER BY h.harness_number ASC`
      : `SELECT h.*, p.model_name, c.name as customer_name 
         FROM harnesses h 
         JOIN projects p ON h.project_id = p.id 
         JOIN customers c ON p.customer_id = c.id 
         ORDER BY c.name ASC, p.model_name ASC, h.harness_number ASC`;
    return projectId ? db.prepare(sql).all(projectId) : db.prepare(sql).all();
  },

  create(projectId: number, harnessNumber: string, createdBy = "Engineer") {
    const clean = (harnessNumber || "").trim().toUpperCase();
    if (!clean) throw new Error("Harness Number must be provided.");

    const db = getDb();
    const existing = db.prepare("SELECT id FROM harnesses WHERE LOWER(harness_number) = LOWER(?)").get(clean);
    if (existing) {
      throw new Error(`Harness Number '${clean}' already exists in the company. Harness numbers are globally unique.`);
    }

    const info = db.prepare(
      "INSERT INTO harnesses (project_id, harness_number, created_by, modified_by) VALUES (?, ?, ?, ?)"
    ).run(projectId, clean, createdBy, createdBy);
    return db.prepare("SELECT * FROM harnesses WHERE id = ?").get(info.lastInsertRowid);
  }
};

// -------------------------------------------------------------
// 2. REVISION SERVICE (POKA-YOKE: SINGLE ACTIVE PER HARNESS)
// -------------------------------------------------------------
export const RevisionService = {
  list(harnessId?: number) {
    const db = getDb();
    const sql = harnessId
      ? "SELECT * FROM revisions WHERE harness_id = ? ORDER BY id ASC"
      : `SELECT r.*, h.harness_number, p.model_name, c.name as customer_name
         FROM revisions r
         JOIN harnesses h ON r.harness_id = h.id
         JOIN projects p ON h.project_id = p.id
         JOIN customers c ON p.customer_id = c.id
         ORDER BY h.harness_number ASC, r.id ASC`;
    return harnessId ? db.prepare(sql).all(harnessId) : db.prepare(sql).all();
  },

  create(data: {
    harness_id: number;
    revision_code: string;
    sop_number: string;
    volume: number;
    circuit_count: number;
    status?: "Active" | "Obsolete";
    created_by?: string;
  }) {
    const cleanCode = (data.revision_code || "").trim();
    const cleanSOP = (data.sop_number || "").trim();
    const status = data.status || "Active";

    if (!cleanCode) throw new Error("Revision code must be provided.");
    if (!cleanSOP) throw new Error("SOP Number must be provided.");
    if (data.volume < 0) throw new Error("Volume cannot be negative.");
    if (data.circuit_count < 0) throw new Error("Number of circuits cannot be negative.");

    const db = getDb();
    const harness = db.prepare("SELECT * FROM harnesses WHERE id = ?").get(data.harness_id) as any;
    if (!harness) throw new Error(`Harness with ID ${data.harness_id} does not exist.`);

    // 1. Check duplicate revision for same harness
    const existing = db.prepare(
      "SELECT id FROM revisions WHERE harness_id = ? AND LOWER(revision_code) = LOWER(?)"
    ).get(data.harness_id, cleanCode);
    if (existing) {
      throw new Error(`Revision '${cleanCode}' already exists for Harness '${harness.harness_number}'.`);
    }

    // 2. POKA-YOKE: Only one revision per Harness can be Active at a time!
    if (status === "Active") {
      const activeRev = db.prepare(
        "SELECT * FROM revisions WHERE harness_id = ? AND status = 'Active'"
      ).get(data.harness_id) as any;
      if (activeRev) {
        throw new Error(
          `Cannot activate Revision '${cleanCode}' because Revision '${activeRev.revision_code}' is still Active for Harness '${harness.harness_number}'. ` +
          `Manually mark Revision '${activeRev.revision_code}' as Obsolete before activating Revision '${cleanCode}'.`
        );
      }
    }

    const user = data.created_by || "Engineer";
    const info = db.prepare(`
      INSERT INTO revisions (harness_id, revision_code, sop_number, volume, circuit_count, status, created_by, modified_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.harness_id, cleanCode, cleanSOP, data.volume, data.circuit_count, status, user, user);

    return db.prepare("SELECT * FROM revisions WHERE id = ?").get(info.lastInsertRowid);
  },

  setStatus(revisionId: number, newStatus: "Active" | "Obsolete", modifiedBy = "Engineer") {
    const db = getDb();
    const rev = db.prepare("SELECT * FROM revisions WHERE id = ?").get(revisionId) as any;
    if (!rev) throw new Error("Revision not found.");

    if (rev.status === newStatus) return rev;

    if (newStatus === "Active") {
      const activeRev = db.prepare(
        "SELECT * FROM revisions WHERE harness_id = ? AND status = 'Active' AND id != ?"
      ).get(rev.harness_id, revisionId) as any;
      if (activeRev) {
        const harness = db.prepare("SELECT harness_number FROM harnesses WHERE id = ?").get(rev.harness_id) as any;
        throw new Error(
          `Cannot activate Revision '${rev.revision_code}' because Revision '${activeRev.revision_code}' is still Active for Harness '${harness?.harness_number}'. ` +
          `Manually mark Revision '${activeRev.revision_code}' as Obsolete before activating Revision '${rev.revision_code}'.`
        );
      }
    }

    db.prepare("UPDATE revisions SET status = ?, modified_by = ?, modified_at = datetime('now') WHERE id = ?")
      .run(newStatus, modifiedBy, revisionId);
    return db.prepare("SELECT * FROM revisions WHERE id = ?").get(revisionId);
  }
};

// -------------------------------------------------------------
// 3. RFQ SERVICE (QUERY BLOCKING & UNIQUE NUMBERING)
// -------------------------------------------------------------
export const RFQService = {
  generateNextNumber(): string {
    const db = getDb();
    const prefix = "RFQ61826";
    const rows = db.prepare(`
      SELECT rfq_number, sr_no, unique_rfq_no 
      FROM rfqs 
      WHERE rfq_number LIKE ? OR sr_no LIKE ? OR unique_rfq_no LIKE ?
    `).all(`${prefix}%`, `${prefix}%`, `${prefix}%`) as any[];
    let maxSeq = 0;
    for (const r of rows) {
      for (const field of [r.rfq_number, r.sr_no, r.unique_rfq_no]) {
        const numStr = (field || "").trim();
        if (numStr.startsWith(prefix)) {
          const seqStr = numStr.slice(prefix.length);
          const seq = parseInt(seqStr, 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    }
    const nextSeq = maxSeq + 1;
    return `${prefix}${String(nextSeq).padStart(4, "0")}`;
  },

  list() {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        r.*, 
        COALESCE(r.customer_name, c.name, '') as customer_name,
        COALESCE(r.review_note, '') as review_note,
        COALESCE(r.drawing_number, '') as drawing_number,
        COALESCE(r.model, p.model_name, '') as model,
        COALESCE(r.model, p.model_name, '') as model_name,
        COALESCE(r.harness_part_no, h.harness_number) as harness_number, 
        COALESCE(r.customer_revision, rev.revision_code) as revision_code, 
        rev.sop_number, 
        COALESCE(r.no_of_ckt, rev.circuit_count) as circuit_count, 
        COALESCE(r.volume, rev.volume) as volume, 
        COALESCE(r.engineer_name, eng.name, '') as engineer_name
      FROM rfqs r
      LEFT JOIN harnesses h ON r.harness_id = h.id
      LEFT JOIN revisions rev ON r.revision_id = rev.id
      LEFT JOIN projects p ON h.project_id = p.id
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN engineers eng ON r.engineer_id = eng.id
      ORDER BY r.id DESC
    `).all() as any[];

    return rows.map((r) => {
      const isMilestoneClosed = (s?: string | null) => {
        if (!s) return false;
        const lower = s.trim().toLowerCase();
        return lower === "close" || lower === "closed";
      };
      const allClosed = isMilestoneClosed(r.query_status) && isMilestoneClosed(r.unique_status) && isMilestoneClosed(r.costing_bom_status);
      if (allClosed) {
        r.overall_rfq_status = "Close";
      } else if (isMilestoneClosed(r.overall_rfq_status)) {
        r.overall_rfq_status = "Open";
      } else if (!r.overall_rfq_status || r.overall_rfq_status === "Submitted" || r.overall_rfq_status === "In Progress" || r.overall_rfq_status === "need to review") {
        r.overall_rfq_status = "Open";
      }
      return r;
    });
  },

  create(data: {
    harness_id?: number | null;
    revision_id?: number | null;
    customer_name?: string;
    drawing_number?: string;
    model?: string;
    engineer_id?: number | null;
    engineer_name?: string;
    harness_part_no?: string;
    customer_revision?: string;
    harness_number?: string;
    revision_code?: string;
    sr_no?: string;
    rfq_number?: string;
    unique_rfq_no?: string;
    fg_code?: string;
    fg_rev?: string;
    description?: string;
    no_of_ckt?: number | string;
    volume?: number | string;
    circuit_count?: number | string;
    marketing_input_date?: string;
    design_input_date?: string;
    work_start_date?: string;
    start_date?: string;
    target_date?: string;
    completion_date?: string;
    actual_date?: string;
    costing_bom_prepare_date?: string;
    costing_bom_submitted_date?: string;
    costing_bom_shared_date?: string;
    costing_bom_status?: string;
    query_yes_no?: boolean;
    query_submitted_date?: string;
    query_sent_date?: string;
    reply_received_date?: string;
    query_resolve_date?: string;
    query_type?: string;
    query_status?: string;
    query_remark?: string;
    unique_list_share_date?: string;
    unique_status?: string;
    proposal_yes_no?: boolean;
    proposal_submitted_date?: string;
    proposal_status?: string;
    proposal_remark?: string;
    remark?: string;
    review_note?: string;
    overall_rfq_status?: string;
    create_ecn?: boolean;
    created_by?: string;
  }) {
    const db = getDb();

    // POKA-YOKE: End Date > Starting Date validation!
    const startDate = data.work_start_date || data.start_date || null;
    const targetDate = data.target_date || null;
    const actualDate = data.completion_date || data.actual_date || null;

    if (startDate && targetDate && targetDate <= startDate) {
      throw new Error(`Target Date (${targetDate}) must be greater than Start Date (${startDate}).`);
    }
    if (startDate && actualDate && actualDate <= startDate) {
      throw new Error(`Actual Date (${actualDate}) must be greater than Start Date (${startDate}).`);
    }

    // POKA-YOKE: Blocking query check!
    const queryYes = data.query_yes_no ? 1 : 0;
    const queryStatus = data.query_status || "Open";
    const bomDate = data.costing_bom_submitted_date || data.costing_bom_shared_date;
    const isQueryUnresolved = queryYes === 1 && queryStatus !== "Close" && queryStatus !== "Resolved";
    if (isQueryUnresolved && bomDate) {
      throw new Error(
        "Cannot record Costing BOM Submitted Date while an unresolved query exists. " +
        "The unresolved query must be resolved before submitting Costing BOM."
      );
    }

    // POKA-YOKE: Overall status depends on other columns!
    const isClosedVal = (s?: string | null) => {
      if (!s) return false;
      const lower = s.trim().toLowerCase();
      return lower === "close" || lower === "closed";
    };

    const uniqueStatus = data.unique_status || "Open";
    const costingBomStatus = data.costing_bom_status || "Open";
    const allMilestonesClosed = isClosedVal(queryStatus) && isClosedVal(uniqueStatus) && isClosedVal(costingBomStatus);
    let overallStatus = data.overall_rfq_status || (allMilestonesClosed ? "Close" : "Open");

    if (isClosedVal(overallStatus) && !allMilestonesClosed) {
      const openParts: string[] = [];
      if (!isClosedVal(queryStatus)) openParts.push(`Query status is '${queryStatus}'`);
      if (!isClosedVal(uniqueStatus)) openParts.push(`Unique status is '${uniqueStatus}'`);
      if (!isClosedVal(costingBomStatus)) openParts.push(`Costing BOM status is '${costingBomStatus}'`);
      throw new Error(
        `Cannot set Overall status to 'Close' because other milestone columns are still open (${openParts.join(", ")}). All milestone statuses must be 'Close' first.`
      );
    }

    if (allMilestonesClosed) {
      overallStatus = "Close";
    }

    const rfqNumber = data.rfq_number?.trim() || this.generateNextNumber();
    const srNo = data.sr_no?.trim() || rfqNumber;
    const uniqueRfqNo = data.unique_rfq_no?.trim() || rfqNumber;
    const drawingNumber = data.drawing_number?.trim() || null;
    const modelVal = data.model?.trim() || null;
    const engineerId = data.engineer_id ? Number(data.engineer_id) : null;
    let engineerName = data.engineer_name?.trim() || null;
    if (engineerId && !engineerName) {
      const eng = db.prepare("SELECT name FROM engineers WHERE id = ?").get(engineerId) as any;
      if (eng) engineerName = eng.name;
    }

    const harnessPartNo = (data.harness_part_no ?? data.harness_number ?? "") ? String(data.harness_part_no ?? data.harness_number).trim() : null;
    const customerRevision = (data.customer_revision ?? data.revision_code ?? "") ? String(data.customer_revision ?? data.revision_code).trim() : null;
    const harnessId = data.harness_id ? Number(data.harness_id) : null;
    const revisionId = data.revision_id ? Number(data.revision_id) : null;
    const noOfCkt = (data.no_of_ckt !== undefined && data.no_of_ckt !== null && data.no_of_ckt !== "")
      ? Number(String(data.no_of_ckt).replace(/[^0-9]/g, ""))
      : (data.circuit_count !== undefined && data.circuit_count !== null && data.circuit_count !== "")
        ? Number(String(data.circuit_count).replace(/[^0-9]/g, ""))
        : null;
    const volumeVal = (data.volume !== undefined && data.volume !== null && data.volume !== "")
      ? Number(String(data.volume).replace(/[^0-9]/g, ""))
      : null;
    const user = data.created_by || "Engineer";

    const info = db.prepare(`
      INSERT INTO rfqs (
        rfq_number, customer_name, sr_no, unique_rfq_no, drawing_number, model, engineer_id, engineer_name,
        harness_id, revision_id,
        harness_part_no, customer_revision,
        fg_code, fg_rev, description,
        no_of_ckt, volume,
        marketing_input_date, design_input_date, work_start_date, target_date, completion_date,
        costing_bom_prepare_date, costing_bom_submitted_date, costing_bom_status,
        query_yes_no, query_submitted_date, reply_received_date, query_type, query_status, query_remark,
        unique_list_share_date, unique_status,
        proposal_yes_no, proposal_submitted_date, proposal_status, proposal_remark,
        remark, review_note, overall_rfq_status, created_by, modified_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?,
        ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `).run(
      rfqNumber, data.customer_name?.trim() || null, srNo, uniqueRfqNo, drawingNumber, modelVal, engineerId, engineerName,
      harnessId, revisionId,
      harnessPartNo, customerRevision,
      data.fg_code || null, data.fg_rev || null, data.description || null,
      noOfCkt, volumeVal,
      data.marketing_input_date || null, data.design_input_date || null, startDate, targetDate, actualDate,
      data.costing_bom_prepare_date || null, bomDate || null, costingBomStatus,
      queryYes, (data.query_submitted_date || data.query_sent_date) || null, (data.reply_received_date || data.query_resolve_date) || null, data.query_type || null, queryStatus, (data.query_remark || data.remark) || null,
      data.unique_list_share_date || null, uniqueStatus,
      data.proposal_yes_no ? 1 : 0, data.proposal_submitted_date || null, data.proposal_status || "Open", data.proposal_remark || null,
      data.remark || null, data.review_note || null, overallStatus, user, user
    );

    const createdRfq = db.prepare("SELECT * FROM rfqs WHERE id = ?").get(info.lastInsertRowid) as any;
    if (data.create_ecn) {
      try {
        ECNService.createFromRFQ(createdRfq);
      } catch (err) {
        console.error("Failed to auto-create ECN from RFQ:", err);
      }
    }
    return createdRfq;
  },

  update(id: number, data: any, modifiedBy = "Engineer") {
    const db = getDb();
    const rfq = db.prepare("SELECT * FROM rfqs WHERE id = ?").get(id) as any;
    if (!rfq) throw new Error("RFQ not found.");
    if (rfq.is_deleted === 1) {
      throw new Error("Cannot update a deleted RFQ record.");
    }

    // POKA-YOKE: End Date > Starting Date validation!
    const startDate = (data.work_start_date !== undefined || data.start_date !== undefined)
      ? (data.work_start_date || data.start_date || null)
      : (rfq.work_start_date || rfq.start_date || null);
    const targetDate = data.target_date !== undefined
      ? (data.target_date || null)
      : (rfq.target_date || null);
    const actualDate = (data.completion_date !== undefined || data.actual_date !== undefined)
      ? (data.completion_date || data.actual_date || null)
      : (rfq.completion_date || rfq.actual_date || null);

    if (startDate && targetDate && targetDate <= startDate) {
      throw new Error(`Target Date (${targetDate}) must be greater than Start Date (${startDate}).`);
    }
    if (startDate && actualDate && actualDate <= startDate) {
      throw new Error(`Actual Date (${actualDate}) must be greater than Start Date (${startDate}).`);
    }

    const queryYes = data.query_yes_no !== undefined ? (data.query_yes_no ? 1 : 0) : rfq.query_yes_no;
    const queryStatus = data.query_status || rfq.query_status;
    const bomDate = (data.costing_bom_submitted_date !== undefined ? data.costing_bom_submitted_date : data.costing_bom_shared_date) !== undefined
      ? (data.costing_bom_submitted_date || data.costing_bom_shared_date)
      : rfq.costing_bom_submitted_date;

    const isQueryUnresolved = queryYes === 1 && queryStatus !== "Close" && queryStatus !== "Resolved";
    if (isQueryUnresolved && bomDate) {
      throw new Error(
        "Cannot record Costing BOM Submitted Date while an unresolved query exists. " +
        "The unresolved query must be resolved before submitting Costing BOM."
      );
    }

    // POKA-YOKE: Overall status depends on other columns!
    const isClosedVal = (s?: string | null) => {
      if (!s) return false;
      const lower = s.trim().toLowerCase();
      return lower === "close" || lower === "closed";
    };

    const uniqueStatus = data.unique_status !== undefined ? data.unique_status : rfq.unique_status;
    const costingBomStatus = data.costing_bom_status !== undefined ? data.costing_bom_status : rfq.costing_bom_status;
    let overallStatus = data.overall_rfq_status !== undefined ? data.overall_rfq_status : rfq.overall_rfq_status;

    const areAllSubStatusesClosed = isClosedVal(queryStatus) && isClosedVal(uniqueStatus) && isClosedVal(costingBomStatus);

    if (data.overall_rfq_status !== undefined && isClosedVal(data.overall_rfq_status) && !areAllSubStatusesClosed) {
      const openParts: string[] = [];
      if (!isClosedVal(queryStatus)) openParts.push(`Query status is '${queryStatus}'`);
      if (!isClosedVal(uniqueStatus)) openParts.push(`Unique status is '${uniqueStatus}'`);
      if (!isClosedVal(costingBomStatus)) openParts.push(`Costing BOM status is '${costingBomStatus}'`);
      throw new Error(
        `Cannot set Overall status to 'Close' because other milestone columns are still open (${openParts.join(", ")}). All milestone statuses must be 'Close' first.`
      );
    }

    // Auto-dependency:
    // When all three milestone columns are Close, overall status automatically becomes "Close"
    if (areAllSubStatusesClosed) {
      overallStatus = "Close";
    } else if (isClosedVal(overallStatus)) {
      // If any milestone column is open/unresolved, overall status automatically reverts to "Open"
      overallStatus = "Open";
    }

    const engineerId = data.engineer_id !== undefined ? (data.engineer_id ? Number(data.engineer_id) : null) : (rfq.engineer_id || null);
    let engineerName = data.engineer_name !== undefined ? (data.engineer_name || null) : (rfq.engineer_name || null);
    if (engineerId && !engineerName) {
      const eng = db.prepare("SELECT name FROM engineers WHERE id = ?").get(engineerId) as any;
      if (eng) engineerName = eng.name;
    }

    const noOfCkt = (data.no_of_ckt !== undefined && data.no_of_ckt !== null && data.no_of_ckt !== "")
      ? Number(String(data.no_of_ckt).replace(/[^0-9]/g, ""))
      : (data.circuit_count !== undefined && data.circuit_count !== null && data.circuit_count !== "")
        ? Number(String(data.circuit_count).replace(/[^0-9]/g, ""))
        : null;
    const volumeVal = (data.volume !== undefined && data.volume !== null && data.volume !== "")
      ? Number(String(data.volume).replace(/[^0-9]/g, ""))
      : null;
    const harnessPartNo = (data.harness_part_no ?? data.harness_number) !== undefined ? (data.harness_part_no ?? data.harness_number) : null;
    const customerRevision = (data.customer_revision ?? data.revision_code) !== undefined ? (data.customer_revision ?? data.revision_code) : null;

    db.prepare(`
      UPDATE rfqs SET
        customer_name = COALESCE(?, customer_name),
        sr_no = COALESCE(?, sr_no),
        unique_rfq_no = COALESCE(?, unique_rfq_no),
        drawing_number = COALESCE(?, drawing_number),
        model = COALESCE(?, model),
        engineer_id = ?,
        engineer_name = ?,
        harness_part_no = COALESCE(?, harness_part_no),
        customer_revision = COALESCE(?, customer_revision),
        fg_code = COALESCE(?, fg_code),
        fg_rev = COALESCE(?, fg_rev),
        description = COALESCE(?, description),
        no_of_ckt = COALESCE(?, no_of_ckt),
        volume = COALESCE(?, volume),
        marketing_input_date = COALESCE(?, marketing_input_date),
        design_input_date = COALESCE(?, design_input_date),
        work_start_date = COALESCE(?, work_start_date),
        target_date = COALESCE(?, target_date),
        completion_date = COALESCE(?, completion_date),
        costing_bom_prepare_date = COALESCE(?, costing_bom_prepare_date),
        costing_bom_submitted_date = COALESCE(?, costing_bom_submitted_date),
        costing_bom_status = COALESCE(?, costing_bom_status),
        query_yes_no = ?,
        query_submitted_date = COALESCE(?, query_submitted_date),
        reply_received_date = COALESCE(?, reply_received_date),
        query_type = COALESCE(?, query_type),
        query_status = COALESCE(?, query_status),
        query_remark = COALESCE(?, query_remark),
        unique_list_share_date = COALESCE(?, unique_list_share_date),
        unique_status = COALESCE(?, unique_status),
        proposal_yes_no = ?,
        proposal_submitted_date = COALESCE(?, proposal_submitted_date),
        proposal_status = COALESCE(?, proposal_status),
        proposal_remark = COALESCE(?, proposal_remark),
        remark = COALESCE(?, remark),
        review_note = COALESCE(?, review_note),
        overall_rfq_status = ?,
        is_deleted = COALESCE(?, is_deleted),
        modified_by = ?,
        modified_at = datetime('now')
      WHERE id = ?
    `).run(
      data.customer_name ?? null,
      data.sr_no ?? null,
      data.unique_rfq_no ?? null,
      data.drawing_number ?? null,
      data.model ?? null,
      engineerId,
      engineerName,
      harnessPartNo,
      customerRevision,
      data.fg_code ?? null,
      data.fg_rev ?? null,
      data.description ?? null,
      noOfCkt,
      volumeVal,
      data.marketing_input_date ?? null,
      data.design_input_date ?? null,
      (data.work_start_date || data.start_date) ?? null,
      data.target_date ?? null,
      (data.completion_date || data.actual_date) ?? null,
      data.costing_bom_prepare_date ?? null,
      (data.costing_bom_submitted_date || data.costing_bom_shared_date) ?? null,
      data.costing_bom_status ?? null,
      queryYes,
      (data.query_submitted_date || data.query_sent_date) ?? null,
      (data.reply_received_date || data.query_resolve_date) ?? null,
      data.query_type ?? null,
      queryStatus ?? null,
      (data.query_remark || data.remark) ?? null,
      data.unique_list_share_date ?? null,
      data.unique_status ?? null,
      data.proposal_yes_no !== undefined ? (data.proposal_yes_no ? 1 : 0) : rfq.proposal_yes_no,
      data.proposal_submitted_date ?? null,
      data.proposal_status ?? null,
      data.proposal_remark ?? null,
      data.remark ?? null,
      data.review_note ?? null,
      overallStatus,
      data.is_deleted !== undefined ? (data.is_deleted ? 1 : 0) : null,
      modifiedBy,
      id
    );

    return db.prepare("SELECT * FROM rfqs WHERE id = ?").get(id);
  },

  softDelete(id: number) {
    const db = getDb();
    db.prepare("UPDATE rfqs SET is_deleted = 1, modified_at = datetime('now') WHERE id = ?").run(id);
    return db.prepare("SELECT * FROM rfqs WHERE id = ?").get(id);
  },

  restore(id: number) {
    throw new Error("Restoring deleted RFQ records is not permitted. Once deleted, RFQs remain permanently archived for traceability.");
  }
};

// -------------------------------------------------------------
// 4. ECN SERVICE (POKA-YOKE: ASSIGNMENT LOCK, COSTING LINKAGE, DELAY REASON)
// -------------------------------------------------------------
export const ECNService = {
  generateNextNumber(year = new Date().getFullYear()): string {
    const db = getDb();
    const prefix = `ECN-${year}-`;
    const rows = db.prepare("SELECT ecn_number FROM ecns WHERE ecn_number LIKE ?").all(`${prefix}%`) as any[];
    let maxSeq = 0;
    for (const r of rows) {
      const parts = r.ecn_number.split("-");
      const seq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
    return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
  },

  list() {
    const db = getDb();
    const ecns = db.prepare(`
      SELECT e.*, 
        COALESCE(e.customer_name, c.name, '') as customer_name,
        COALESCE(e.model_name, p.model_name, '') as model_name,
        COALESCE(e.rfq_no, r.rfq_number, r.sr_no, '') as rfq_no,
        COALESCE(e.overall_status, e.ecn_status, 'Open') as overall_status,
        COALESCE(e.stage, 'sample') as stage,
        COALESCE(e.query_status, r.query_status, 'Open') as query_status,
        COALESCE(e.unique_list_share_date, r.unique_list_share_date, '') as unique_list_share_date,
        COALESCE(e.unique_rfq_no, r.unique_rfq_no, r.rfq_number, '') as unique_rfq_no,
        COALESCE(e.unique_status, r.unique_status, 'Open') as unique_status,
        COALESCE(e.sap_bom_upload_date, '') as sap_bom_upload_date,
        COALESCE(e.sap_bom_released_date, '') as sap_bom_released_date,
        COALESCE(e.prd_bom_release_date, '') as prd_bom_release_date,
        COALESCE(e.label_upload_date, '') as label_upload_date,
        COALESCE(e.min_by_engineer_date, '') as min_by_engineer_date,
        COALESCE(e.min_by_ppc, '') as min_by_ppc,
        COALESCE(e.min_status, 'Open') as min_status,
        COALESCE(e.review, '') as review,
        COALESCE(e.no_of_ckt, r.no_of_ckt, s_rev.circuit_count, 0) as no_of_ckt,
        COALESCE(e.volume, r.volume, s_rev.volume, 0) as volume,
        COALESCE(e.work_start_date, '') as work_start_date,
        COALESCE(e.target_date, '') as target_date,
        COALESCE(e.completion_date, e.min_meeting_date, '') as completion_date,
        COALESCE(e.completion_date, e.min_meeting_date, '') as actual_date,
        h.harness_number, 
        s_rev.revision_code as source_rev_code, 
        n_rev.revision_code as new_rev_code,
        p_eng.name as primary_engineer_name, 
        s_eng.name as support_engineer_name,
        r.rfq_number as related_rfq_number
      FROM ecns e
      LEFT JOIN harnesses h ON e.harness_id = h.id
      LEFT JOIN revisions s_rev ON e.source_revision_id = s_rev.id
      LEFT JOIN revisions n_rev ON e.new_revision_id = n_rev.id
      LEFT JOIN engineers p_eng ON e.primary_engineer_id = p_eng.id
      LEFT JOIN engineers s_eng ON e.support_engineer_id = s_eng.id
      LEFT JOIN rfqs r ON e.rfq_id = r.id
      LEFT JOIN projects p ON h.project_id = p.id
      LEFT JOIN customers c ON p.customer_id = c.id
      WHERE COALESCE(e.is_deleted, 0) = 0
      ORDER BY e.id DESC
    `).all() as any[];

    // Calculate duration fields in calendar days
    return ecns.map(e => {
      const plannedDuration = daysBetween(e.target_date, e.work_start_date);
      const actualDuration = daysBetween(e.completion_date || e.min_meeting_date, e.work_start_date);
      let delayDays = 0;
      const minDate = e.completion_date || e.min_meeting_date;
      if (minDate && e.target_date) {
        const diff = daysBetween(minDate, e.target_date);
        if (diff !== null && diff > 0) delayDays = diff;
      }
      return {
        ...e,
        planned_duration: plannedDuration,
        actual_duration: actualDuration,
        delay_days: delayDays
      };
    });
  },

  createFromRFQ(rfq: any) {
    const nextNum = this.generateNextNumber();
    const db = getDb();
    const user = rfq.created_by || "Engineer";

    const info = db.prepare(`
      INSERT INTO ecns (
        ecn_number, rfq_id, rfq_no, stage, customer_name, model_name,
        query_status, unique_list_share_date, unique_rfq_no, unique_status,
        sap_bom_upload_date, sap_bom_released_date, prd_bom_release_date,
        label_upload_date, min_by_engineer_date, min_by_ppc, min_status,
        review, overall_status, no_of_ckt, volume, work_start_date, target_date, completion_date,
        harness_id, source_revision_id, primary_engineer_id, change_reason,
        stage_context, development_type, ecn_status, created_by, modified_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `).run(
      nextNum,
      rfq.id,
      rfq.sr_no || rfq.rfq_number,
      "sample",
      rfq.customer_name || "",
      rfq.model || "",
      rfq.query_status || "Open",
      rfq.unique_list_share_date || "",
      rfq.unique_rfq_no || rfq.rfq_number || "",
      rfq.unique_status || "Open",
      "", "", "",
      "", "", "", "Open",
      "",
      rfq.overall_rfq_status || "Open",
      (rfq.no_of_ckt !== undefined && rfq.no_of_ckt !== null && rfq.no_of_ckt !== "") ? Number(rfq.no_of_ckt) : null,
      (rfq.volume !== undefined && rfq.volume !== null && rfq.volume !== "") ? Number(rfq.volume) : null,
      rfq.work_start_date || "",
      rfq.target_date || "",
      rfq.completion_date || "",
      rfq.harness_id || null,
      rfq.revision_id || null,
      rfq.engineer_id || null,
      `Autofilled from RFQ ${rfq.rfq_number || rfq.sr_no}`,
      "Sample",
      "New Development",
      rfq.overall_rfq_status || "Open",
      user,
      user
    );

    return db.prepare("SELECT * FROM ecns WHERE id = ?").get(info.lastInsertRowid);
  },

  create(data: {
    harness_id?: number | null;
    source_revision_id?: number | null;
    stage_context?: "Sample" | "Production" | string;
    development_type?: "New Development" | "Productized" | string;
    change_reason?: string;
    primary_engineer_id?: number | null;
    target_date?: string | null;
    revision_impact?: "New Revision" | "Same Revision" | string;
    new_revision_id?: number | null;
    costing_required?: boolean;
    rfq_id?: number | null;
    support_engineer_id?: number | null;
    design_input_date?: string | null;
    work_start_date?: string | null;
    min_meeting_date?: string | null;
    ecn_status?: string | null;
    delay_reason?: string | null;
    created_by?: string;
    rfq_no?: string | null;
    stage?: string | null;
    customer_name?: string | null;
    model_name?: string | null;
    query_status?: string | null;
    unique_list_share_date?: string | null;
    unique_rfq_no?: string | null;
    unique_status?: string | null;
    sap_bom_upload_date?: string | null;
    sap_bom_released_date?: string | null;
    prd_bom_release_date?: string | null;
    label_upload_date?: string | null;
    min_by_engineer_date?: string | null;
    min_by_ppc?: string | null;
    min_status?: string | null;
    review?: string | null;
    overall_status?: string | null;
    no_of_ckt?: number | string | null;
    volume?: number | string | null;
    start_date?: string | null;
    actual_date?: string | null;
    completion_date?: string | null;
  }) {
    const db = getDb();
    const cleanReason = (data.change_reason || "").trim();

    // If formal creation without customer_name/rfq_no, enforce legacy mandatory fields
    const isLegacyCall = !data.rfq_no && !data.customer_name && data.harness_id;
    if (isLegacyCall) {
      if (!cleanReason) throw new Error("Change/Reason is mandatory for every ECN.");
      if (!data.primary_engineer_id) throw new Error("Primary Engineer is mandatory.");
      if (!data.target_date) throw new Error("Target Date is mandatory.");
    }

    const impact = data.revision_impact || "Same Revision";
    if (impact === "New Revision" && !data.new_revision_id) {
      throw new Error("New Revision must be provided when Revision Impact is 'New Revision'.");
    }

    const costingRequired = data.costing_required ? 1 : 0;
    if (costingRequired === 1 && !data.rfq_id) {
      throw new Error("A related RFQ is mandatory when Costing Required is Yes.");
    }

    // Delay validation
    const cleanDelay = (data.delay_reason || "").trim();
    if (data.min_meeting_date && data.target_date) {
      const delay = daysBetween(data.min_meeting_date, data.target_date);
      if (delay !== null && delay > 0 && !cleanDelay) {
        throw new Error(`MIN Meeting Date (${data.min_meeting_date}) is later than Target Date (${data.target_date}). A Delay Reason is mandatory.`);
      }
    }

    const ecnNumber = (data as any).ecn_number || this.generateNextNumber();
    const completionDate = data.completion_date || data.actual_date || data.min_meeting_date || null;
    const user = data.created_by || "Engineer";

    const info = db.prepare(`
      INSERT INTO ecns (
        ecn_number, rfq_no, stage, customer_name, model_name,
        query_status, unique_list_share_date, unique_rfq_no, unique_status,
        sap_bom_upload_date, sap_bom_released_date, prd_bom_release_date,
        label_upload_date, min_by_engineer_date, min_by_ppc, min_status,
        review, overall_status, no_of_ckt, volume, work_start_date, target_date, completion_date,
        harness_id, source_revision_id, stage_context, development_type,
        change_reason, revision_impact, new_revision_id, costing_required, rfq_id,
        primary_engineer_id, support_engineer_id, design_input_date, min_meeting_date,
        ecn_status, delay_reason, created_by, modified_by
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      ecnNumber,
      data.rfq_no || null,
      data.stage || "sample",
      data.customer_name || null,
      data.model_name || null,
      data.query_status || "Open",
      data.unique_list_share_date || null,
      data.unique_rfq_no || null,
      data.unique_status || "Open",
      data.sap_bom_upload_date || null,
      data.sap_bom_released_date || null,
      data.prd_bom_release_date || null,
      data.label_upload_date || null,
      data.min_by_engineer_date || null,
      data.min_by_ppc || null,
      data.min_status || "Open",
      data.review || null,
      data.overall_status || data.ecn_status || "Open",
      (data.no_of_ckt !== undefined && data.no_of_ckt !== null && data.no_of_ckt !== "") ? Number(String(data.no_of_ckt).replace(/[^0-9]/g, "")) : null,
      (data.volume !== undefined && data.volume !== null && data.volume !== "") ? Number(String(data.volume).replace(/[^0-9]/g, "")) : null,
      data.work_start_date || data.start_date || null,
      data.target_date || null,
      completionDate,
      data.harness_id ? Number(data.harness_id) : null,
      data.source_revision_id ? Number(data.source_revision_id) : null,
      data.stage_context || "Sample",
      data.development_type || "New Development",
      cleanReason || `ECN ${ecnNumber}`,
      impact,
      data.new_revision_id ? Number(data.new_revision_id) : null,
      costingRequired,
      data.rfq_id ? Number(data.rfq_id) : null,
      data.primary_engineer_id ? Number(data.primary_engineer_id) : null,
      data.support_engineer_id ? Number(data.support_engineer_id) : null,
      data.design_input_date || null,
      data.min_meeting_date || null,
      data.overall_status || data.ecn_status || "Open",
      cleanDelay || null,
      user,
      user
    );

    return db.prepare("SELECT * FROM ecns WHERE id = ?").get(info.lastInsertRowid);
  },

  update(id: number, data: any, modifiedBy = "Engineer") {
    const db = getDb();
    const ecn = db.prepare("SELECT * FROM ecns WHERE id = ?").get(id) as any;
    if (!ecn) throw new Error("ECN not found.");
    if (ecn.is_deleted === 1) {
      throw new Error("Cannot update a deleted ECN record.");
    }

    // POKA-YOKE: Primary engineer cannot be reassigned after work has started!
    if (data.primary_engineer_id !== undefined && data.primary_engineer_id !== ecn.primary_engineer_id) {
      if (ecn.work_start_date) {
        throw new Error(
          `Primary Engineer cannot be reassigned after Work Start Date (${ecn.work_start_date}) has been recorded.`
        );
      }
    }

    // POKA-YOKE: Delay reason mandatory if MIN Meeting Date > Target Date
    const targetDate = data.target_date !== undefined ? data.target_date : ecn.target_date;
    const minDate = data.min_meeting_date !== undefined ? data.min_meeting_date : ecn.min_meeting_date;
    const delayReason = data.delay_reason !== undefined ? (data.delay_reason || "").trim() : (ecn.delay_reason || "").trim();

    if (minDate && targetDate) {
      const delay = daysBetween(minDate, targetDate);
      if (delay !== null && delay > 0 && !delayReason) {
        throw new Error(`MIN Meeting Date (${minDate}) is later than Target Date (${targetDate}). A Delay Reason is mandatory.`);
      }
    }

    const completionDate = (data.completion_date !== undefined || data.actual_date !== undefined)
      ? (data.completion_date || data.actual_date || null)
      : (minDate || ecn.completion_date);

    const noOfCkt = (data.no_of_ckt !== undefined && data.no_of_ckt !== null && data.no_of_ckt !== "")
      ? Number(String(data.no_of_ckt).replace(/[^0-9]/g, ""))
      : (data.no_of_ckt !== undefined ? null : ecn.no_of_ckt);
    const volumeVal = (data.volume !== undefined && data.volume !== null && data.volume !== "")
      ? Number(String(data.volume).replace(/[^0-9]/g, ""))
      : (data.volume !== undefined ? null : ecn.volume);

    db.prepare(`
      UPDATE ecns SET
        rfq_no = COALESCE(?, rfq_no),
        stage = COALESCE(?, stage),
        customer_name = COALESCE(?, customer_name),
        model_name = COALESCE(?, model_name),
        query_status = COALESCE(?, query_status),
        unique_list_share_date = COALESCE(?, unique_list_share_date),
        unique_rfq_no = COALESCE(?, unique_rfq_no),
        unique_status = COALESCE(?, unique_status),
        sap_bom_upload_date = COALESCE(?, sap_bom_upload_date),
        sap_bom_released_date = COALESCE(?, sap_bom_released_date),
        prd_bom_release_date = COALESCE(?, prd_bom_release_date),
        label_upload_date = COALESCE(?, label_upload_date),
        min_by_engineer_date = COALESCE(?, min_by_engineer_date),
        min_by_ppc = COALESCE(?, min_by_ppc),
        min_status = COALESCE(?, min_status),
        review = COALESCE(?, review),
        overall_status = COALESCE(?, overall_status),
        no_of_ckt = ?,
        volume = ?,
        work_start_date = COALESCE(?, work_start_date),
        target_date = COALESCE(?, target_date),
        completion_date = ?,
        stage_context = COALESCE(?, stage_context),
        development_type = COALESCE(?, development_type),
        change_reason = COALESCE(?, change_reason),
        revision_impact = COALESCE(?, revision_impact),
        new_revision_id = ?,
        costing_required = ?,
        rfq_id = ?,
        primary_engineer_id = COALESCE(?, primary_engineer_id),
        support_engineer_id = ?,
        design_input_date = ?,
        min_meeting_date = ?,
        ecn_status = COALESCE(?, ecn_status),
        delay_reason = ?,
        is_deleted = COALESCE(?, is_deleted),
        modified_by = ?,
        modified_at = datetime('now')
      WHERE id = ?
    `).run(
      data.rfq_no ?? null,
      data.stage ?? null,
      data.customer_name ?? null,
      data.model_name ?? null,
      data.query_status ?? null,
      data.unique_list_share_date ?? null,
      data.unique_rfq_no ?? null,
      data.unique_status ?? null,
      data.sap_bom_upload_date ?? null,
      data.sap_bom_released_date ?? null,
      data.prd_bom_release_date ?? null,
      data.label_upload_date ?? null,
      data.min_by_engineer_date ?? null,
      data.min_by_ppc ?? null,
      data.min_status ?? null,
      data.review ?? null,
      data.overall_status ?? data.ecn_status ?? null,
      noOfCkt,
      volumeVal,
      (data.work_start_date || data.start_date) ?? null,
      data.target_date ?? null,
      completionDate,
      data.stage_context ?? null,
      data.development_type ?? null,
      data.change_reason ?? null,
      data.revision_impact ?? null,
      data.new_revision_id !== undefined ? data.new_revision_id : (ecn.new_revision_id ?? null),
      data.costing_required !== undefined ? (data.costing_required ? 1 : 0) : ecn.costing_required,
      data.rfq_id !== undefined ? data.rfq_id : (ecn.rfq_id ?? null),
      data.primary_engineer_id ?? null,
      data.support_engineer_id !== undefined ? data.support_engineer_id : (ecn.support_engineer_id ?? null),
      data.design_input_date !== undefined ? data.design_input_date : (ecn.design_input_date ?? null),
      minDate ?? null,
      data.overall_status ?? data.ecn_status ?? null,
      delayReason || null,
      data.is_deleted !== undefined ? (data.is_deleted ? 1 : 0) : null,
      modifiedBy,
      id
    );

    return db.prepare("SELECT * FROM ecns WHERE id = ?").get(id);
  },

  softDelete(id: number) {
    const db = getDb();
    db.prepare("UPDATE ecns SET is_deleted = 1, modified_at = datetime('now') WHERE id = ?").run(id);
    return db.prepare("SELECT * FROM ecns WHERE id = ?").get(id);
  }
};

// -------------------------------------------------------------
// 5. BOM & LABEL SERVICES (SEQUENTIAL ALTERNATE & PREREQUISITES)
// -------------------------------------------------------------
export const BOMService = {
  getNextAlternate(fgCode: string): string {
    const db = getDb();
    const rows = db.prepare("SELECT bom_alternate FROM bom_records WHERE LOWER(fg_code) = LOWER(?)").all(fgCode) as any[];
    let maxSeq = 0;
    for (const r of rows) {
      const seq = parseInt(r.bom_alternate, 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
    return String(maxSeq + 1).padStart(2, "0");
  },

  list() {
    const db = getDb();
    const boms = db.prepare(`
      SELECT b.*, 
        e.ecn_number, 
        h.harness_number, 
        p.model_name, 
        c.name as customer_name,
        u.name as uploaded_by_name,
        (SELECT COUNT(*) FROM label_uploads l WHERE l.bom_id = b.id) as label_count
      FROM bom_records b
      JOIN ecns e ON b.ecn_id = e.id
      JOIN harnesses h ON e.harness_id = h.id
      JOIN projects p ON h.project_id = p.id
      JOIN customers c ON p.customer_id = c.id
      JOIN engineers u ON b.uploaded_by_id = u.id
      ORDER BY b.id DESC
    `).all() as any[];

    return boms.map(b => ({
      ...b,
      bom_status: b.release_date ? "Released" : (b.upload_date ? "Uploaded" : "Pending Upload"),
      label_status: b.label_count > 0 ? "Uploaded" : "Not Uploaded"
    }));
  },

  upload(data: {
    ecn_id: number;
    fg_code: string;
    customer_part_number: string;
    customer_revision: string;
    fg_revision: string;
    uploaded_by_id: number;
    bom_alternate?: string;
    upload_date?: string;
    release_date?: string;
    created_by?: string;
  }) {
    const db = getDb();
    const cleanFG = (data.fg_code || "").trim().toUpperCase();
    const cleanCPN = (data.customer_part_number || "").trim();
    const cleanCRev = (data.customer_revision || "").trim();
    const cleanFGRev = (data.fg_revision || "").trim();

    if (!cleanFG) throw new Error("FG Code must be provided.");
    if (!cleanCPN) throw new Error("Customer Part Number must be provided.");
    if (!cleanCRev) throw new Error("Customer Revision must be provided.");
    if (!cleanFGRev) throw new Error("FG Revision must be provided.");

    const expectedAlt = this.getNextAlternate(cleanFG);
    const altToUse = data.bom_alternate ? data.bom_alternate.trim().padStart(2, "0") : expectedAlt;

    // Check duplicate
    const existing = db.prepare(
      "SELECT id FROM bom_records WHERE LOWER(fg_code) = LOWER(?) AND bom_alternate = ?"
    ).get(cleanFG, altToUse);
    if (existing) {
      throw new Error(`BOM alternate '${altToUse}' already exists for FG Code '${cleanFG}'. Duplicate alternates are strictly blocked.`);
    }

    // Enforce sequential alternate
    if (altToUse !== expectedAlt) {
      throw new Error(`Invalid BOM alternate '${altToUse}' for FG Code '${cleanFG}'. The next expected sequential alternate is '${expectedAlt}'.`);
    }

    const uploadDate = data.upload_date || new Date().toISOString().split("T")[0];
    const user = data.created_by || "Engineer";

    const info = db.prepare(`
      INSERT INTO bom_records (
        fg_code, bom_alternate, customer_part_number, customer_revision, fg_revision,
        ecn_id, uploaded_by_id, upload_date, release_date, created_by, modified_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cleanFG, altToUse, cleanCPN, cleanCRev, cleanFGRev,
      data.ecn_id, data.uploaded_by_id, uploadDate, data.release_date || null, user, user
    );

    return db.prepare("SELECT * FROM bom_records WHERE id = ?").get(info.lastInsertRowid);
  },

  release(bomId: number, releaseDate?: string, modifiedBy = "Engineer") {
    const db = getDb();
    const actualDate = releaseDate || new Date().toISOString().split("T")[0];
    db.prepare("UPDATE bom_records SET release_date = ?, modified_by = ?, modified_at = datetime('now') WHERE id = ?")
      .run(actualDate, modifiedBy, bomId);
    return db.prepare("SELECT * FROM bom_records WHERE id = ?").get(bomId);
  }
};

export const LabelService = {
  list(bomId?: number) {
    const db = getDb();
    const sql = bomId
      ? `SELECT l.*, u.name as uploaded_by_name FROM label_uploads l JOIN engineers u ON l.uploaded_by_id = u.id WHERE l.bom_id = ? ORDER BY l.id DESC`
      : `SELECT l.*, u.name as uploaded_by_name FROM label_uploads l JOIN engineers u ON l.uploaded_by_id = u.id ORDER BY l.id DESC`;
    return bomId ? db.prepare(sql).all(bomId) : db.prepare(sql).all();
  },

  upload(data: {
    bom_id: number;
    uploaded_by_id: number;
    reason: string;
    upload_date?: string;
    created_by?: string;
  }) {
    const db = getDb();
    const bom = db.prepare("SELECT * FROM bom_records WHERE id = ?").get(data.bom_id) as any;
    if (!bom) throw new Error("BOM record not found.");

    // POKA-YOKE: Target BOM MUST be released before label can be uploaded!
    if (!bom.release_date) {
      throw new Error(
        `Cannot upload label for BOM '${bom.fg_code}' Alternate '${bom.bom_alternate}' because the BOM has not been released yet. ` +
        `The BOM must be released before a label can be uploaded.`
      );
    }

    const cleanReason = (data.reason || "").trim();
    if (!cleanReason) throw new Error("Reason is mandatory for every label upload.");

    const uploadDate = data.upload_date || new Date().toISOString().split("T")[0];
    const user = data.created_by || "Engineer";

    const info = db.prepare(`
      INSERT INTO label_uploads (
        bom_id, fg_code, bom_alternate, uploaded_by_id, upload_date, reason, created_by, modified_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.bom_id, bom.fg_code, bom.bom_alternate, data.uploaded_by_id, uploadDate, cleanReason, user, user
    );

    return db.prepare("SELECT * FROM label_uploads WHERE id = ?").get(info.lastInsertRowid);
  }
};

// -------------------------------------------------------------
// 6. MIN & CONSOLIDATED KIT SERVICE ("NO MIN, NO KIT ENTRY")
// -------------------------------------------------------------
export const MINService = {
  record(data: {
    ecn_id: number;
    meeting_date: string;
    remarks?: string;
    created_by?: string;
  }) {
    const db = getDb();
    const existing = db.prepare("SELECT id FROM min_meetings WHERE ecn_id = ?").get(data.ecn_id);
    if (existing) {
      throw new Error("Only one MIN meeting is permitted per ECN in the V1 specification.");
    }

    const user = data.created_by || "Engineer";
    const info = db.prepare(`
      INSERT INTO min_meetings (ecn_id, meeting_date, remarks, created_by, modified_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.ecn_id, data.meeting_date, data.remarks || null, user, user);

    // Concurrently update ECN min_meeting_date and completion_date
    db.prepare(`
      UPDATE ecns SET 
        min_meeting_date = ?, 
        completion_date = ?,
        ecn_status = 'Completed',
        modified_by = ?,
        modified_at = datetime('now')
      WHERE id = ?
    `).run(data.meeting_date, data.meeting_date, user, data.ecn_id);

    return db.prepare("SELECT * FROM min_meetings WHERE id = ?").get(info.lastInsertRowid);
  }
};

export const KitService = {
  listConsolidated() {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        k.id as kit_id,
        k.ecn_id,
        k.rack_number,
        k.file_number,
        k.hard_copy_location,
        k.status,
        e.ecn_number,
        e.min_meeting_date,
        e.stage_context,
        e.development_type,
        h.harness_number,
        COALESCE(nr.revision_code, sr.revision_code) as revision_code,
        COALESCE(nr.sop_number, sr.sop_number) as sop_number,
        COALESCE(nr.volume, sr.volume) as volume,
        COALESCE(nr.circuit_count, sr.circuit_count) as circuit_count,
        p.model_name,
        c.name as customer_name
      FROM consolidated_kits k
      JOIN ecns e ON k.ecn_id = e.id
      JOIN harnesses h ON e.harness_id = h.id
      JOIN revisions sr ON e.source_revision_id = sr.id
      LEFT JOIN revisions nr ON e.new_revision_id = nr.id
      JOIN projects p ON h.project_id = p.id
      JOIN customers c ON p.customer_id = c.id
      ORDER BY k.id DESC
    `).all() as any[];

    return rows.map(r => ({
      ...r,
      rack_number: r.rack_number || "-",
      file_number: r.file_number || "-",
      hard_copy_location: r.hard_copy_location || "-"
    }));
  },

  createOrUpdate(data: {
    ecn_id: number;
    rack_number?: string;
    file_number?: string;
    hard_copy_location?: string;
    status?: "Active" | "Obsolete";
    created_by?: string;
  }) {
    const db = getDb();
    const ecn = db.prepare("SELECT * FROM ecns WHERE id = ?").get(data.ecn_id) as any;
    if (!ecn) throw new Error("ECN not found.");

    // POKA-YOKE: "No MIN, no Kit List entry!"
    const minMeeting = db.prepare("SELECT id FROM min_meetings WHERE ecn_id = ?").get(data.ecn_id);
    if (!minMeeting && !ecn.min_meeting_date) {
      throw new Error(
        `Cannot create Kit entry for ECN '${ecn.ecn_number}' because its MIN meeting has not been concluded. ` +
        `The business rule is: No MIN, no Kit List entry.`
      );
    }

    const user = data.created_by || "Engineer";
    const existing = db.prepare("SELECT id FROM consolidated_kits WHERE ecn_id = ?").get(data.ecn_id) as any;

    if (existing) {
      db.prepare(`
        UPDATE consolidated_kits SET
          rack_number = ?, file_number = ?, hard_copy_location = ?, status = ?,
          modified_by = ?, modified_at = datetime('now')
        WHERE id = ?
      `).run(
        data.rack_number || null, data.file_number || null, data.hard_copy_location || null,
        data.status || "Active", user, existing.id
      );
      return db.prepare("SELECT * FROM consolidated_kits WHERE id = ?").get(existing.id);
    }

    const info = db.prepare(`
      INSERT INTO consolidated_kits (
        ecn_id, rack_number, file_number, hard_copy_location, status, created_by, modified_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.ecn_id, data.rack_number || null, data.file_number || null, data.hard_copy_location || null,
      data.status || "Active", user, user
    );

    return db.prepare("SELECT * FROM consolidated_kits WHERE id = ?").get(info.lastInsertRowid);
  }
};

// -------------------------------------------------------------
// 7. DASHBOARD & WORKLOAD ANALYTICS SERVICES
// -------------------------------------------------------------
export const DashboardService = {
  getProjectMetrics(projectId?: number) {
    const db = getDb();
    const projFilter = projectId ? "WHERE p.id = ?" : "";

    const totalHarnesses = (projectId
      ? db.prepare(`SELECT COUNT(h.id) as count FROM harnesses h JOIN projects p ON h.project_id = p.id WHERE p.id = ?`).get(projectId)
      : db.prepare(`SELECT COUNT(h.id) as count FROM harnesses h JOIN projects p ON h.project_id = p.id`).get()) as any;

    const activeRevisions = (projectId
      ? db.prepare(`SELECT COUNT(r.id) as count FROM revisions r JOIN harnesses h ON r.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE r.status = 'Active' AND p.id = ?`).get(projectId)
      : db.prepare(`SELECT COUNT(r.id) as count FROM revisions r JOIN harnesses h ON r.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE r.status = 'Active'`).get()) as any;

    const openRfqs = (projectId
      ? db.prepare(`SELECT COUNT(rfq.id) as count FROM rfqs rfq JOIN harnesses h ON rfq.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE rfq.overall_rfq_status NOT IN ('Completed', 'Cancelled') AND p.id = ?`).get(projectId)
      : db.prepare(`SELECT COUNT(rfq.id) as count FROM rfqs rfq JOIN harnesses h ON rfq.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE rfq.overall_rfq_status NOT IN ('Completed', 'Cancelled')`).get()) as any;

    const openEcns = (projectId
      ? db.prepare(`SELECT COUNT(e.id) as count FROM ecns e JOIN harnesses h ON e.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE e.ecn_status NOT IN ('Completed', 'Cancelled') AND p.id = ?`).get(projectId)
      : db.prepare(`SELECT COUNT(e.id) as count FROM ecns e JOIN harnesses h ON e.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE e.ecn_status NOT IN ('Completed', 'Cancelled')`).get()) as any;

    const pendingBOMReleases = (projectId
      ? db.prepare(`SELECT COUNT(b.id) as count FROM bom_records b JOIN ecns e ON b.ecn_id = e.id JOIN harnesses h ON e.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE b.release_date IS NULL AND p.id = ?`).get(projectId)
      : db.prepare(`SELECT COUNT(b.id) as count FROM bom_records b JOIN ecns e ON b.ecn_id = e.id JOIN harnesses h ON e.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE b.release_date IS NULL`).get()) as any;

    const pendingLabels = (projectId
      ? db.prepare(`SELECT COUNT(b.id) as count FROM bom_records b JOIN ecns e ON b.ecn_id = e.id JOIN harnesses h ON e.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE b.release_date IS NOT NULL AND (SELECT COUNT(*) FROM label_uploads l WHERE l.bom_id = b.id) = 0 AND p.id = ?`).get(projectId)
      : db.prepare(`SELECT COUNT(b.id) as count FROM bom_records b JOIN ecns e ON b.ecn_id = e.id JOIN harnesses h ON e.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE b.release_date IS NOT NULL AND (SELECT COUNT(*) FROM label_uploads l WHERE l.bom_id = b.id) = 0`).get()) as any;

    const minCompleted = (projectId
      ? db.prepare(`SELECT COUNT(e.id) as count FROM ecns e JOIN harnesses h ON e.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE e.min_meeting_date IS NOT NULL AND p.id = ?`).get(projectId)
      : db.prepare(`SELECT COUNT(e.id) as count FROM ecns e JOIN harnesses h ON e.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE e.min_meeting_date IS NOT NULL`).get()) as any;

    const minPending = (projectId
      ? db.prepare(`SELECT COUNT(e.id) as count FROM ecns e JOIN harnesses h ON e.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE e.min_meeting_date IS NULL AND e.ecn_status != 'Cancelled' AND p.id = ?`).get(projectId)
      : db.prepare(`SELECT COUNT(e.id) as count FROM ecns e JOIN harnesses h ON e.harness_id = h.id JOIN projects p ON h.project_id = p.id WHERE e.min_meeting_date IS NULL AND e.ecn_status != 'Cancelled'`).get()) as any;

    const harnessList = (projectId
      ? db.prepare(`SELECT h.*, p.model_name, c.name as customer_name, (SELECT revision_code FROM revisions r WHERE r.harness_id = h.id AND r.status = 'Active') as active_revision, (SELECT COUNT(*) FROM ecns e WHERE e.harness_id = h.id) as ecn_count FROM harnesses h JOIN projects p ON h.project_id = p.id JOIN customers c ON p.customer_id = c.id WHERE p.id = ? ORDER BY h.harness_number ASC`).all(projectId)
      : db.prepare(`SELECT h.*, p.model_name, c.name as customer_name, (SELECT revision_code FROM revisions r WHERE r.harness_id = h.id AND r.status = 'Active') as active_revision, (SELECT COUNT(*) FROM ecns e WHERE e.harness_id = h.id) as ecn_count FROM harnesses h JOIN projects p ON h.project_id = p.id JOIN customers c ON p.customer_id = c.id ORDER BY h.harness_number ASC`).all());

    return {
      total_harnesses: totalHarnesses?.count || 0,
      active_revisions: activeRevisions?.count || 0,
      open_rfqs: openRfqs?.count || 0,
      open_ecns: openEcns?.count || 0,
      pending_bom_releases: pendingBOMReleases?.count || 0,
      pending_labels: pendingLabels?.count || 0,
      min_completed: minCompleted?.count || 0,
      min_pending: minPending?.count || 0,
      harnesses: harnessList
    };
  },

  getEngineerWorkload(engineerId?: number) {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];

    let engSql = "SELECT * FROM engineers WHERE is_active = 1";
    if (engineerId) engSql += ` AND id = ${engineerId}`;
    const engineers = db.prepare(engSql).all() as any[];

    return engineers.map(eng => {
      const openEcns = db.prepare(`
        SELECT e.*, h.harness_number, p.model_name, c.name as customer_name
        FROM ecns e
        JOIN harnesses h ON e.harness_id = h.id
        JOIN projects p ON h.project_id = p.id
        JOIN customers c ON p.customer_id = c.id
        WHERE (e.primary_engineer_id = ? OR e.support_engineer_id = ?)
          AND e.ecn_status NOT IN ('Completed', 'Cancelled')
      `).all(eng.id, eng.id) as any[];

      const overdueEcns = openEcns.filter(e => e.target_date && e.target_date < today);
      const upcomingEcns = openEcns.filter(e => e.target_date && e.target_date >= today);

      const completedEcns = db.prepare(`
        SELECT COUNT(*) as count FROM ecns
        WHERE primary_engineer_id = ? AND ecn_status = 'Completed'
      `).get(eng.id) as any;

      return {
        engineer_id: eng.id,
        engineer_name: eng.name,
        open_ecns_count: openEcns.length,
        upcoming_ecns_count: upcomingEcns.length,
        overdue_ecns_count: overdueEcns.length,
        completed_ecns_count: completedEcns?.count || 0,
        open_ecns: openEcns
      };
    });
  },

  getProjectKitData(projectId: number) {
    const db = getDb();
    const rows = db.prepare(`
      SELECT 
        h.harness_number as harness,
        c.name as customer,
        p.model_name as model,
        r.revision_code as revision,
        r.sop_number,
        r.volume,
        r.circuit_count,
        e.ecn_number,
        e.stage_context,
        e.development_type,
        eng.name as primary_engineer,
        b.fg_code as bom_fg,
        b.bom_alternate,
        b.release_date as bom_release_date,
        e.min_meeting_date,
        k.rack_number,
        k.file_number
      FROM harnesses h
      JOIN projects p ON h.project_id = p.id
      JOIN customers c ON p.customer_id = c.id
      LEFT JOIN revisions r ON r.harness_id = h.id AND r.status = 'Active'
      LEFT JOIN ecns e ON e.harness_id = h.id
      LEFT JOIN engineers eng ON e.primary_engineer_id = eng.id
      LEFT JOIN bom_records b ON b.ecn_id = e.id
      LEFT JOIN consolidated_kits k ON k.ecn_id = e.id
      WHERE p.id = ?
      ORDER BY h.harness_number ASC
    `).all(projectId) as any[];

    return rows.map(r => ({
      ...r,
      bom_status: r.bom_release_date ? "Released" : (r.bom_fg ? "Uploaded" : "Pending Upload"),
      label_status: r.bom_release_date ? "Not Uploaded" : "Pending BOM",
      rack_number: r.rack_number || "-",
      file_number: r.file_number || "-"
    }));
  }
};
