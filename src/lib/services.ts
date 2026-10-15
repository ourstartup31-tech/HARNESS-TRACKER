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
  generateNextNumber(year = new Date().getFullYear()): string {
    const db = getDb();
    const prefix = `RFQ-${year}-`;
    const rows = db.prepare("SELECT rfq_number FROM rfqs WHERE rfq_number LIKE ?").all(`${prefix}%`) as any[];
    let maxSeq = 0;
    for (const r of rows) {
      const parts = r.rfq_number.split("-");
      const seq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
    return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
  },

  list() {
    const db = getDb();
    return db.prepare(`
      SELECT 
        r.*, 
        h.harness_number, 
        rev.revision_code, 
        rev.sop_number, 
        rev.circuit_count, 
        rev.volume, 
        p.model_name, 
        c.name as customer_name
      FROM rfqs r
      JOIN harnesses h ON r.harness_id = h.id
      JOIN revisions rev ON r.revision_id = rev.id
      JOIN projects p ON h.project_id = p.id
      JOIN customers c ON p.customer_id = c.id
      ORDER BY r.id DESC
    `).all();
  },

  create(data: {
    harness_id: number;
    revision_id: number;
    fg_code?: string;
    fg_rev?: string;
    description?: string;
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
    query_status?: "Open" | "Resolved" | "Cancelled";
    query_remark?: string;
    unique_list_share_date?: string;
    unique_status?: string;
    proposal_yes_no?: boolean;
    proposal_submitted_date?: string;
    proposal_status?: "Pending" | "Submitted" | "Approved" | "Rejected";
    proposal_remark?: string;
    remark?: string;
    overall_rfq_status?: "Open" | "In Progress" | "Submitted" | "Completed" | "Cancelled";
    created_by?: string;
  }) {
    const db = getDb();

    // POKA-YOKE: Blocking query check!
    const queryYes = data.query_yes_no ? 1 : 0;
    const queryStatus = data.query_status || "Open";
    const bomDate = data.costing_bom_submitted_date || data.costing_bom_shared_date;
    if (queryYes === 1 && queryStatus === "Open" && bomDate) {
      throw new Error(
        "Cannot record Costing BOM Submitted Date while an unresolved query exists. " +
        "The unresolved query must be resolved before submitting Costing BOM."
      );
    }

    const rfqNumber = this.generateNextNumber();
    const user = data.created_by || "Engineer";

    const info = db.prepare(`
      INSERT INTO rfqs (
        rfq_number, harness_id, revision_id, fg_code, fg_rev, description,
        marketing_input_date, design_input_date, work_start_date, target_date, completion_date,
        costing_bom_prepare_date, costing_bom_submitted_date, costing_bom_status,
        query_yes_no, query_submitted_date, reply_received_date, query_type, query_status, query_remark,
        unique_list_share_date, unique_status,
        proposal_yes_no, proposal_submitted_date, proposal_status, proposal_remark,
        remark, overall_rfq_status, created_by, modified_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      rfqNumber, data.harness_id, data.revision_id, data.fg_code || null, data.fg_rev || null, data.description || null,
      data.marketing_input_date || null, data.design_input_date || null, (data.work_start_date || data.start_date) || null, data.target_date || null, (data.completion_date || data.actual_date) || null,
      data.costing_bom_prepare_date || null, bomDate || null, data.costing_bom_status || "Pending",
      queryYes, (data.query_submitted_date || data.query_sent_date) || null, (data.reply_received_date || data.query_resolve_date) || null, data.query_type || null, queryStatus, (data.query_remark || data.remark) || null,
      data.unique_list_share_date || null, data.unique_status || "Open",
      data.proposal_yes_no ? 1 : 0, data.proposal_submitted_date || null, data.proposal_status || "Pending", data.proposal_remark || null,
      data.remark || null, data.overall_rfq_status || "Open", user, user
    );

    return db.prepare("SELECT * FROM rfqs WHERE id = ?").get(info.lastInsertRowid);
  },

  update(id: number, data: any, modifiedBy = "Engineer") {
    const db = getDb();
    const rfq = db.prepare("SELECT * FROM rfqs WHERE id = ?").get(id) as any;
    if (!rfq) throw new Error("RFQ not found.");

    const queryYes = data.query_yes_no !== undefined ? (data.query_yes_no ? 1 : 0) : rfq.query_yes_no;
    const queryStatus = data.query_status || rfq.query_status;
    const bomDate = (data.costing_bom_submitted_date !== undefined ? data.costing_bom_submitted_date : data.costing_bom_shared_date) !== undefined
      ? (data.costing_bom_submitted_date || data.costing_bom_shared_date)
      : rfq.costing_bom_submitted_date;

    if (queryYes === 1 && queryStatus === "Open" && bomDate) {
      throw new Error(
        "Cannot record Costing BOM Submitted Date while an unresolved query exists. " +
        "The unresolved query must be resolved before submitting Costing BOM."
      );
    }

    db.prepare(`
      UPDATE rfqs SET
        fg_code = COALESCE(?, fg_code),
        fg_rev = COALESCE(?, fg_rev),
        description = COALESCE(?, description),
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
        overall_rfq_status = COALESCE(?, overall_rfq_status),
        modified_by = ?,
        modified_at = datetime('now')
      WHERE id = ?
    `).run(
      data.fg_code ?? null,
      data.fg_rev ?? null,
      data.description ?? null,
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
      data.overall_rfq_status ?? null,
      modifiedBy,
      id
    );

    return db.prepare("SELECT * FROM rfqs WHERE id = ?").get(id);
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
        h.harness_number, 
        s_rev.revision_code as source_rev_code, 
        n_rev.revision_code as new_rev_code,
        p_eng.name as primary_engineer_name, 
        s_eng.name as support_engineer_name,
        r.rfq_number as related_rfq_number,
        p.model_name, 
        c.name as customer_name
      FROM ecns e
      JOIN harnesses h ON e.harness_id = h.id
      JOIN revisions s_rev ON e.source_revision_id = s_rev.id
      LEFT JOIN revisions n_rev ON e.new_revision_id = n_rev.id
      JOIN engineers p_eng ON e.primary_engineer_id = p_eng.id
      LEFT JOIN engineers s_eng ON e.support_engineer_id = s_eng.id
      LEFT JOIN rfqs r ON e.rfq_id = r.id
      JOIN projects p ON h.project_id = p.id
      JOIN customers c ON p.customer_id = c.id
      ORDER BY e.id DESC
    `).all() as any[];

    // Calculate duration fields in calendar days
    return ecns.map(e => {
      const plannedDuration = daysBetween(e.target_date, e.work_start_date);
      const actualDuration = daysBetween(e.min_meeting_date, e.work_start_date);
      let delayDays = 0;
      if (e.min_meeting_date && e.target_date) {
        const diff = daysBetween(e.min_meeting_date, e.target_date);
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

  create(data: {
    harness_id: number;
    source_revision_id: number;
    stage_context: "Sample" | "Production";
    development_type: "New Development" | "Productized";
    change_reason: string;
    primary_engineer_id: number;
    target_date: string;
    revision_impact?: "New Revision" | "Same Revision";
    new_revision_id?: number | null;
    costing_required?: boolean;
    rfq_id?: number | null;
    support_engineer_id?: number | null;
    design_input_date?: string;
    work_start_date?: string;
    min_meeting_date?: string;
    ecn_status?: string;
    delay_reason?: string;
    created_by?: string;
  }) {
    const db = getDb();
    const cleanReason = (data.change_reason || "").trim();
    if (!cleanReason) throw new Error("Change/Reason is mandatory for every ECN.");
    if (!data.primary_engineer_id) throw new Error("Primary Engineer is mandatory.");
    if (!data.target_date) throw new Error("Target Date is mandatory.");

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

    const ecnNumber = this.generateNextNumber();
    const completionDate = data.min_meeting_date || null;
    const user = data.created_by || "Engineer";

    const info = db.prepare(`
      INSERT INTO ecns (
        ecn_number, harness_id, source_revision_id, stage_context, development_type,
        change_reason, revision_impact, new_revision_id, costing_required, rfq_id,
        primary_engineer_id, support_engineer_id, design_input_date, work_start_date,
        target_date, min_meeting_date, completion_date, ecn_status, delay_reason,
        created_by, modified_by
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
    `).run(
      ecnNumber, data.harness_id, data.source_revision_id, data.stage_context, data.development_type,
      cleanReason, impact, data.new_revision_id || null, costingRequired, data.rfq_id || null,
      data.primary_engineer_id, data.support_engineer_id || null, data.design_input_date || null, data.work_start_date || null,
      data.target_date, data.min_meeting_date || null, completionDate, data.ecn_status || "In Progress", cleanDelay || null,
      user, user
    );

    return db.prepare("SELECT * FROM ecns WHERE id = ?").get(info.lastInsertRowid);
  },

  update(id: number, data: any, modifiedBy = "Engineer") {
    const db = getDb();
    const ecn = db.prepare("SELECT * FROM ecns WHERE id = ?").get(id) as any;
    if (!ecn) throw new Error("ECN not found.");

    // POKA-YOKE: Primary engineer cannot be reassigned after work has started!
    if (data.primary_engineer_id !== undefined && data.primary_engineer_id !== ecn.primary_engineer_id) {
      if (ecn.work_start_date) {
        throw new Error(
          `Primary Engineer cannot be reassigned after Work Start Date (${ecn.work_start_date}) has been recorded.`
        );
      }
    }

    // POKA-YOKE: Delay reason mandatory if MIN Meeting Date > Target Date
    const targetDate = data.target_date || ecn.target_date;
    const minDate = data.min_meeting_date !== undefined ? data.min_meeting_date : ecn.min_meeting_date;
    const delayReason = data.delay_reason !== undefined ? (data.delay_reason || "").trim() : (ecn.delay_reason || "").trim();

    if (minDate && targetDate) {
      const delay = daysBetween(minDate, targetDate);
      if (delay !== null && delay > 0 && !delayReason) {
        throw new Error(`MIN Meeting Date (${minDate}) is later than Target Date (${targetDate}). A Delay Reason is mandatory.`);
      }
    }

    const completionDate = minDate || ecn.completion_date;

    db.prepare(`
      UPDATE ecns SET
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
        work_start_date = ?,
        target_date = COALESCE(?, target_date),
        min_meeting_date = ?,
        completion_date = ?,
        ecn_status = COALESCE(?, ecn_status),
        delay_reason = ?,
        modified_by = ?,
        modified_at = datetime('now')
      WHERE id = ?
    `).run(
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
      data.work_start_date !== undefined ? data.work_start_date : (ecn.work_start_date ?? null),
      data.target_date ?? null,
      minDate ?? null,
      completionDate ?? null,
      data.ecn_status ?? null,
      delayReason || null,
      modifiedBy,
      id
    );

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
