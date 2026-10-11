import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

// Setup unique isolated SQLite database for test suite
const TEST_DB = path.join(process.cwd(), "data", `test_engineering_tracker_${Date.now()}.db`);
process.env.ENGINEERING_TRACKER_DB_URL = TEST_DB;

// Dynamic import ensures services load with the test database
const {
  CustomerService,
  EngineerService,
  ProjectService,
  HarnessService,
  RevisionService,
  RFQService,
  ECNService,
  BOMService,
  LabelService,
  MINService,
  KitService,
  DashboardService
} = await import("../src/lib/services.ts");

test("MASTER DATA & HIERARCHY TESTS", async (t) => {
  await t.test("Customer creation, duplicate rejection, and deactivation", () => {
    const cust = CustomerService.create("Tata Motors Test");
    assert.ok(cust.id);
    assert.equal(cust.name, "Tata Motors Test");

    // Reject duplicate name (case-insensitive)
    assert.throws(() => CustomerService.create("tata motors test"), /already exists/);

    // Deactivation preserves history
    CustomerService.setActive(cust.id, false);
    const updated = CustomerService.list().find(c => c.id === cust.id);
    assert.equal(updated.is_active, 0);
  });

  await t.test("Identical model names under different customers remain separate projects", () => {
    const custA = CustomerService.create("OEM Alpha");
    const custB = CustomerService.create("OEM Beta");

    const projA = ProjectService.getOrCreate(custA.id, "Model-X");
    const projB = ProjectService.getOrCreate(custB.id, "Model-X");

    assert.notEqual(projA.id, projB.id);
    assert.equal(projA.customer_id, custA.id);
    assert.equal(projB.customer_id, custB.id);
  });

  await t.test("Harness numbers are globally unique across the entire company", () => {
    const cust = CustomerService.create("Mahindra OEM");
    const proj = ProjectService.getOrCreate(cust.id, "Scorpio-EV");

    const h1 = HarnessService.create(proj.id, "GLOBAL-HARN-001");
    assert.ok(h1.id);

    // Duplicate harness number globally rejected
    assert.throws(() => HarnessService.create(proj.id, "global-harn-001"), /already exists in the company/);
  });
});

test("REVISION CONTROL & SINGLE-ACTIVE POKA-YOKE", async (t) => {
  const cust = CustomerService.create("Test Rev OEM");
  const proj = ProjectService.getOrCreate(cust.id, "RevModel");
  const harness = HarnessService.create(proj.id, "HARN-REV-TEST-01");

  await t.test("Harness can have multiple revisions and immutability", () => {
    const revA = RevisionService.create({
      harness_id: harness.id,
      revision_code: "A",
      sop_number: "SOP-001",
      volume: 5000,
      circuit_count: 50,
      status: "Obsolete"
    });
    const revB = RevisionService.create({
      harness_id: harness.id,
      revision_code: "B",
      sop_number: "SOP-002",
      volume: 7500,
      circuit_count: 55,
      status: "Active"
    });

    assert.equal(revA.sop_number, "SOP-001");
    assert.equal(revB.sop_number, "SOP-002");
    assert.equal(revA.volume, 5000);
    assert.equal(revB.volume, 7500);
  });

  await t.test("Second Active revision is strictly blocked with explanatory message", () => {
    assert.throws(() => {
      RevisionService.create({
        harness_id: harness.id,
        revision_code: "C",
        sop_number: "SOP-003",
        volume: 9000,
        circuit_count: 60,
        status: "Active"
      });
    }, /Cannot activate Revision 'C' because Revision 'B' is still Active/);
  });

  await t.test("Activating new revision succeeds after manual obsolescence", () => {
    const revB = RevisionService.list(harness.id).find(r => r.revision_code === "B");
    RevisionService.setStatus(revB.id, "Obsolete");

    const revC = RevisionService.create({
      harness_id: harness.id,
      revision_code: "C",
      sop_number: "SOP-003",
      volume: 9000,
      circuit_count: 60,
      status: "Active"
    });
    assert.equal(revC.status, "Active");
  });
});

test("RFQ QUERY BLOCKING VALIDATION", async (t) => {
  const cust = CustomerService.create("RFQ OEM");
  const proj = ProjectService.getOrCreate(cust.id, "RFQModel");
  const harness = HarnessService.create(proj.id, "HARN-RFQ-01");
  const rev = RevisionService.create({
    harness_id: harness.id,
    revision_code: "01",
    sop_number: "SOP-RFQ-01",
    volume: 1000,
    circuit_count: 20,
    status: "Active"
  });

  await t.test("Unresolved query blocks Costing BOM submission", () => {
    assert.throws(() => {
      RFQService.create({
        harness_id: harness.id,
        revision_id: rev.id,
        query_yes_no: true,
        query_status: "Open",
        costing_bom_submitted_date: "2026-03-01"
      });
    }, /Cannot record Costing BOM Submitted Date while an unresolved query exists/);
  });

  await t.test("Resolved query allows Costing BOM submission", () => {
    const rfq = RFQService.create({
      harness_id: harness.id,
      revision_id: rev.id,
      query_yes_no: true,
      query_status: "Resolved",
      costing_bom_submitted_date: "2026-03-01"
    });
    assert.ok(rfq.id);
    assert.equal(rfq.costing_bom_submitted_date, "2026-03-01");
  });
});

test("ECN WORKFLOW & ASSIGNMENT LOCKING POKA-YOKE", async (t) => {
  const cust = CustomerService.create("ECN OEM");
  const proj = ProjectService.getOrCreate(cust.id, "ECNModel");
  const harness = HarnessService.create(proj.id, "HARN-ECN-01");
  const rev = RevisionService.create({
    harness_id: harness.id,
    revision_code: "A",
    sop_number: "SOP-ECN-01",
    volume: 2000,
    circuit_count: 40,
    status: "Active"
  });
  const eng1 = EngineerService.create("Eng Primary");
  const eng2 = EngineerService.create("Eng Secondary");

  await t.test("Change/Reason is mandatory", () => {
    assert.throws(() => {
      ECNService.create({
        harness_id: harness.id,
        source_revision_id: rev.id,
        stage_context: "Sample",
        development_type: "New Development",
        change_reason: "   ",
        primary_engineer_id: eng1.id,
        target_date: "2026-04-01"
      });
    }, /Change\/Reason is mandatory/);
  });

  await t.test("Costing Required demands linked RFQ", () => {
    assert.throws(() => {
      ECNService.create({
        harness_id: harness.id,
        source_revision_id: rev.id,
        stage_context: "Sample",
        development_type: "New Development",
        change_reason: "Cost impact change",
        primary_engineer_id: eng1.id,
        target_date: "2026-04-01",
        costing_required: true,
        rfq_id: null
      });
    }, /A related RFQ is mandatory when Costing Required is Yes/);
  });

  await t.test("Primary Engineer cannot be reassigned after work starts", () => {
    const ecn = ECNService.create({
      harness_id: harness.id,
      source_revision_id: rev.id,
      stage_context: "Sample",
      development_type: "New Development",
      change_reason: "Wiring harness redesign",
      primary_engineer_id: eng1.id,
      target_date: "2026-04-01"
    });

    // Before work starts: assignment correction is allowed
    ECNService.update(ecn.id, { primary_engineer_id: eng2.id });

    // Record work start date
    ECNService.update(ecn.id, { work_start_date: "2026-03-10" });

    // After work starts: reassignment must be blocked
    assert.throws(() => {
      ECNService.update(ecn.id, { primary_engineer_id: eng1.id });
    }, /Primary Engineer cannot be reassigned after Work Start Date/);
  });

  await t.test("Delay Reason mandatory if MIN Date > Target Date", () => {
    const ecn = ECNService.create({
      harness_id: harness.id,
      source_revision_id: rev.id,
      stage_context: "Sample",
      development_type: "New Development",
      change_reason: "Delay test change",
      primary_engineer_id: eng1.id,
      target_date: "2026-04-01"
    });

    assert.throws(() => {
      ECNService.update(ecn.id, { min_meeting_date: "2026-04-10", delay_reason: "  " });
    }, /A Delay Reason is mandatory/);

    ECNService.update(ecn.id, {
      min_meeting_date: "2026-04-10",
      delay_reason: "Waiting for customer tool signoff."
    });
  });
});

test("SAP BOM SEQUENCING & LABEL UPLOAD PREREQUISITE", async (t) => {
  const cust = CustomerService.create("BOM OEM");
  const proj = ProjectService.getOrCreate(cust.id, "BOMModel");
  const harness = HarnessService.create(proj.id, "HARN-BOM-01");
  const rev = RevisionService.create({
    harness_id: harness.id,
    revision_code: "A",
    sop_number: "SOP-BOM-01",
    volume: 1000,
    circuit_count: 30,
    status: "Active"
  });
  const eng = EngineerService.create("Eng BOM");
  const ecn = ECNService.create({
    harness_id: harness.id,
    source_revision_id: rev.id,
    stage_context: "Sample",
    development_type: "New Development",
    change_reason: "Initial BOM release",
    primary_engineer_id: eng.id,
    target_date: "2026-05-01"
  });

  await t.test("Sequential alternate validation per FG Code (01, 02...)", () => {
    const bom1 = BOMService.upload({
      ecn_id: ecn.id,
      fg_code: "FG-TEST-99",
      customer_part_number: "CPN-01",
      customer_revision: "A",
      fg_revision: "AA",
      uploaded_by_id: eng.id
    });
    assert.equal(bom1.bom_alternate, "01");

    // Attempting to jump to 03 must fail
    assert.throws(() => {
      BOMService.upload({
        ecn_id: ecn.id,
        fg_code: "FG-TEST-99",
        customer_part_number: "CPN-01",
        customer_revision: "B",
        fg_revision: "BA",
        uploaded_by_id: eng.id,
        bom_alternate: "03"
      });
    }, /The next expected sequential alternate is '02'/);
  });

  await t.test("Label upload strictly blocked before BOM release", () => {
    const bom = BOMService.list().find(b => b.fg_code === "FG-TEST-99");
    assert.equal(bom.release_date, null);

    assert.throws(() => {
      LabelService.upload({
        bom_id: bom.id,
        uploaded_by_id: eng.id,
        reason: "Initial barcode layout"
      });
    }, /because the BOM has not been released yet/);

    // Release BOM and upload label succeeds
    BOMService.release(bom.id, "2026-04-20");
    const label = LabelService.upload({
      bom_id: bom.id,
      uploaded_by_id: eng.id,
      reason: "Initial barcode layout approved"
    });
    assert.ok(label.id);
  });
});

test("MIN MEETING & CONSOLIDATED KIT PREREQUISITE", async (t) => {
  const cust = CustomerService.create("Kit OEM");
  const proj = ProjectService.getOrCreate(cust.id, "KitModel");
  const harness = HarnessService.create(proj.id, "HARN-KIT-01");
  const rev = RevisionService.create({
    harness_id: harness.id,
    revision_code: "A",
    sop_number: "SOP-KIT-01",
    volume: 5000,
    circuit_count: 60,
    status: "Active"
  });
  const eng = EngineerService.create("Eng Kit");
  const ecn = ECNService.create({
    harness_id: harness.id,
    source_revision_id: rev.id,
    stage_context: "Production",
    development_type: "New Development",
    change_reason: "Production launch",
    primary_engineer_id: eng.id,
    target_date: "2026-06-01"
  });

  await t.test("'No MIN, no Kit List entry' rule strictly enforced", () => {
    assert.throws(() => {
      KitService.createOrUpdate({
        ecn_id: ecn.id,
        rack_number: "R-01",
        file_number: "F-01"
      });
    }, /No MIN, no Kit List entry/);
  });

  await t.test("Recording MIN concludes ECN and permits Kit entry generation", () => {
    MINService.record({
      ecn_id: ecn.id,
      meeting_date: "2026-05-25",
      remarks: "Sample harness approved"
    });

    const kit = KitService.createOrUpdate({
      ecn_id: ecn.id,
      rack_number: "R-01",
      file_number: "F-01",
      hard_copy_location: "Archive Cabinet A"
    });
    assert.ok(kit.id);

    const consolidated = KitService.listConsolidated();
    const entry = consolidated.find(k => k.ecn_id === ecn.id);
    assert.equal(entry.harness_number, "HARN-KIT-01");
    assert.equal(entry.revision_code, "A");
    assert.equal(entry.sop_number, "SOP-KIT-01");
    assert.equal(entry.volume, 5000);
    assert.equal(entry.circuit_count, 60);
    assert.equal(entry.rack_number, "R-01");
    assert.equal(entry.file_number, "F-01");
  });
});
