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

  await t.test("All 25 RFQ Tracker columns persist, support custom overrides and update", () => {
    const customRFQ = RFQService.create({
      harness_id: harness.id,
      revision_id: rev.id,
      sr_no: "SR-CUSTOM-099",
      unique_rfq_no: "UNQ-RFQ-8888",
      fg_code: "FG-TEST-999",
      fg_rev: "01A",
      description: "Custom Body Harness Test",
      no_of_ckt: 72,
      volume: 25000,
      marketing_input_date: "2026-02-10",
      design_input_date: "2026-02-12",
      work_start_date: "2026-02-14",
      target_date: "2026-02-28",
      completion_date: "2026-02-27",
      query_submitted_date: "2026-02-15",
      reply_received_date: "2026-02-18",
      query_type: "Technical & Routing",
      query_status: "Resolved",
      unique_list_share_date: "2026-02-20",
      unique_status: "Completed",
      costing_bom_prepare_date: "2026-02-21",
      costing_bom_submitted_date: "2026-02-22",
      costing_bom_status: "Approved",
      remark: "Customer accepted high heat insulation",
      overall_rfq_status: "Completed"
    });

    assert.ok(customRFQ.id);
    assert.equal(customRFQ.sr_no, "SR-CUSTOM-099");
    assert.equal(customRFQ.unique_rfq_no, "UNQ-RFQ-8888");
    assert.equal(customRFQ.no_of_ckt, 72);
    assert.equal(customRFQ.volume, 25000);

    const listed = RFQService.list().find(r => r.id === customRFQ.id);
    assert.equal(listed.circuit_count, 72);
    assert.equal(listed.volume, 25000);
    assert.equal(listed.sr_no, "SR-CUSTOM-099");
    assert.equal(listed.unique_rfq_no, "UNQ-RFQ-8888");
    assert.equal(listed.fg_code, "FG-TEST-999");
    assert.equal(listed.costing_bom_status, "Approved");
    assert.equal(listed.overall_rfq_status, "Completed");

    // Test update
    const updated = RFQService.update(customRFQ.id, {
      no_of_ckt: 75,
      volume: 30000,
      remark: "Updated revision notes"
    });
    assert.equal(updated.no_of_ckt, 75);
    assert.equal(updated.volume, 30000);
    assert.equal(updated.remark, "Updated revision notes");
  });

  await t.test("RFQ auto-numbering generates format RFQ618260001 and increments sequentially", () => {
    const next1 = RFQService.generateNextNumber();
    assert.match(next1, /^RFQ61826\d{4}$/);

    const r1 = RFQService.create({
      rfq_number: next1,
      harness_part_no: "FREE-TEXT-HARN-001",
      customer_revision: "REV-01"
    });
    assert.equal(r1.rfq_number, next1);

    const next2 = RFQService.generateNextNumber();
    const seq1 = parseInt(next1.slice("RFQ61826".length), 10);
    const seq2 = parseInt(next2.slice("RFQ61826".length), 10);
    assert.equal(seq2, seq1 + 1);

    const r2 = RFQService.create({
      rfq_number: next2,
      harness_part_no: "123456789", // pure numeric harness part number
      customer_revision: "99", // pure numeric customer revision
      fg_code: "FG-999-FREE",
      fg_rev: "A",
      description: "Any text or number description"
    });
    assert.equal(r2.rfq_number, next2);

    const next3 = RFQService.generateNextNumber();
    const seq3 = parseInt(next3.slice("RFQ61826".length), 10);
    assert.equal(seq3, seq2 + 1);
  });

  await t.test("Harness Part Number, Customer Revision, FG Code, FG Rev and Description allow any text/number with zero constraints", () => {
    // Pure numbers
    const numOnly = RFQService.create({
      harness_part_no: "9988776655",
      customer_revision: "100",
      fg_code: "55555",
      fg_rev: "1",
      description: "987654"
    });
    assert.ok(numOnly.id);
    assert.equal(numOnly.harness_part_no, "9988776655");
    assert.equal(numOnly.customer_revision, "100");
    assert.equal(numOnly.fg_code, "55555");
    assert.equal(numOnly.fg_rev, "1");
    assert.equal(numOnly.description, "987654");

    // Pure text with special symbols
    const textOnly = RFQService.create({
      harness_part_no: "CUSTOM / SPECIAL #12-AB",
      customer_revision: "RELEASE-CANDIDATE-X",
      fg_code: "fg_code_custom_test",
      fg_rev: "rev_beta",
      description: "Engineering custom harness without predefined master data"
    });
    assert.ok(textOnly.id);
    assert.equal(textOnly.harness_part_no, "CUSTOM / SPECIAL #12-AB");
    assert.equal(textOnly.customer_revision, "RELEASE-CANDIDATE-X");

    // List verifies unconstrained fields appear correctly
    const list = RFQService.list();
    const foundNum = list.find(r => r.id === numOnly.id);
    assert.equal(foundNum.harness_number, "9988776655");
    assert.equal(foundNum.revision_code, "100");

    const foundText = list.find(r => r.id === textOnly.id);
    assert.equal(foundText.harness_number, "CUSTOM / SPECIAL #12-AB");
    assert.equal(foundText.revision_code, "RELEASE-CANDIDATE-X");

    // Update unconstrained fields
    const updated = RFQService.update(numOnly.id, {
      harness_part_no: "MODIFIED-HARN-44",
      customer_revision: "MOD-REV-55"
    });
    assert.equal(updated.harness_part_no, "MODIFIED-HARN-44");
    assert.equal(updated.customer_revision, "MOD-REV-55");
  });

  await t.test("Drawing Number and Model columns persist, list, and update", () => {
    const rfq = RFQService.create({
      drawing_number: "DWG-2026-X99",
      model: "Curvv-EV",
      harness_part_no: "HARN-CRV-01",
      customer_revision: "01",
      description: "Tata Curvv EV Main Harness"
    });
    assert.ok(rfq.id);
    assert.equal(rfq.drawing_number, "DWG-2026-X99");
    assert.equal(rfq.model, "Curvv-EV");

    const listed = RFQService.list().find(r => r.id === rfq.id);
    assert.equal(listed.drawing_number, "DWG-2026-X99");
    assert.equal(listed.model, "Curvv-EV");

    const updated = RFQService.update(rfq.id, {
      drawing_number: "DWG-2026-X100",
      model: "Curvv-EV-Phase2",
      description: "Updated description inline"
    });
    assert.equal(updated.drawing_number, "DWG-2026-X100");
    assert.equal(updated.model, "Curvv-EV-Phase2");
    assert.equal(updated.description, "Updated description inline");
  });

  await t.test("Customer Name and Review Note columns persist, list, and update", () => {
    const rfq = RFQService.create({
      customer_name: "Mahindra & Mahindra",
      drawing_number: "DWG-XUV700-01",
      model: "XUV700-EV",
      review_note: "Initial engineering review completed with customer",
      harness_part_no: "HARN-XUV-99",
      customer_revision: "A"
    });
    assert.ok(rfq.id);
    assert.equal(rfq.customer_name, "Mahindra & Mahindra");
    assert.equal(rfq.review_note, "Initial engineering review completed with customer");

    const listed = RFQService.list().find(r => r.id === rfq.id);
    assert.equal(listed.customer_name, "Mahindra & Mahindra");
    assert.equal(listed.review_note, "Initial engineering review completed with customer");

    const updated = RFQService.update(rfq.id, {
      customer_name: "Tata Motors Commercial",
      review_note: "Updated review note after costing review"
    });
    assert.equal(updated.customer_name, "Tata Motors Commercial");
    assert.equal(updated.review_note, "Updated review note after costing review");
  });

  await t.test("Status dropdown options and Overall status dependency on milestone columns", () => {
    // When sub-statuses are all 'Close', overall can be 'Close'
    const closedRFQ = RFQService.create({
      query_status: "Close",
      unique_status: "Close",
      costing_bom_status: "Close",
      overall_rfq_status: "Close"
    });
    assert.equal(closedRFQ.overall_rfq_status, "Close");

    // If even one column is 'Open' or not 'Close', setting overall to 'Close' is strictly blocked
    assert.throws(() => {
      RFQService.create({
        query_status: "Open",
        unique_status: "Close",
        costing_bom_status: "Close",
        overall_rfq_status: "Close"
      });
    }, /Cannot set Overall status to 'Close' because other milestone columns are still open/);

    assert.throws(() => {
      RFQService.create({
        query_status: "Close",
        unique_status: "Open",
        costing_bom_status: "Close",
        overall_rfq_status: "Close"
      });
    }, /Cannot set Overall status to 'Close' because other milestone columns are still open/);

    assert.throws(() => {
      RFQService.create({
        query_status: "Close",
        unique_status: "Close",
        costing_bom_status: "Open",
        overall_rfq_status: "Close"
      });
    }, /Cannot set Overall status to 'Close' because other milestone columns are still open/);

    // Testing update: cannot close overall if a column is open
    const openRFQ = RFQService.create({
      query_status: "Open",
      unique_status: "Close",
      costing_bom_status: "Close",
      overall_rfq_status: "Open"
    });
    assert.throws(() => {
      RFQService.update(openRFQ.id, { overall_rfq_status: "Close" });
    }, /Cannot set Overall status to 'Close' because other milestone columns are still open/);

    // When last open sub-column is closed, overall status automatically becomes 'Close'
    const autoCloseRFQ = RFQService.create({
      query_status: "Close",
      unique_status: "Close",
      costing_bom_status: "Open"
    });
    assert.equal(autoCloseRFQ.overall_rfq_status, "Open");

    // Updating costing_bom_status to Close automatically transitions overall status to Close
    const updatedToClose = RFQService.update(autoCloseRFQ.id, { costing_bom_status: "Close" });
    assert.equal(updatedToClose.overall_rfq_status, "Close");

    // Listing also guarantees overall_rfq_status is 'Close'
    const listedRFQ = RFQService.list().find(r => r.id === autoCloseRFQ.id);
    assert.equal(listedRFQ.overall_rfq_status, "Close");

    // Reopening any sub-column automatically reverts overall_rfq_status to 'Open'
    const reopened = RFQService.update(autoCloseRFQ.id, { costing_bom_status: "Open" });
    assert.equal(reopened.overall_rfq_status, "Open");
  });

  await t.test("End Date strictly greater than Starting Date validation (Poka-Yoke)", () => {
    // Target date <= start date rejected on create
    assert.throws(() => {
      RFQService.create({
        work_start_date: "2026-05-10",
        target_date: "2026-05-10" // same day rejected
      });
    }, /Target Date \(2026-05-10\) must be greater than Start Date \(2026-05-10\)/);

    assert.throws(() => {
      RFQService.create({
        work_start_date: "2026-05-10",
        target_date: "2026-05-09" // earlier date rejected
      });
    }, /Target Date \(2026-05-09\) must be greater than Start Date \(2026-05-10\)/);

    // Actual / Completion date <= start date rejected on create
    assert.throws(() => {
      RFQService.create({
        work_start_date: "2026-05-10",
        target_date: "2026-05-15",
        completion_date: "2026-05-08"
      });
    }, /Actual Date \(2026-05-08\) must be greater than Start Date \(2026-05-10\)/);

    // Target date strictly greater than start date succeeds
    const validDates = RFQService.create({
      work_start_date: "2026-05-10",
      target_date: "2026-05-20",
      completion_date: "2026-05-18"
    });
    assert.ok(validDates.id);
    assert.equal(validDates.work_start_date, "2026-05-10");
    assert.equal(validDates.target_date, "2026-05-20");

    // Updating to invalid date rejected
    assert.throws(() => {
      RFQService.update(validDates.id, {
        target_date: "2026-05-05"
      });
    }, /Target Date \(2026-05-05\) must be greater than Start Date \(2026-05-10\)/);

    assert.throws(() => {
      RFQService.update(validDates.id, {
        work_start_date: "2026-05-25" // moves start date after target date
      });
    }, /Target Date \(2026-05-20\) must be greater than Start Date \(2026-05-25\)/);
  });

  await t.test("Name column links with Engineer Master data and persists", () => {
    // Add engineer in Engineer Master
    const newEng = EngineerService.create("Rajesh Kulkarni Master");
    assert.ok(newEng.id);

    // Create RFQ with engineer selected from Engineer Master
    const rfqWithEng = RFQService.create({
      engineer_id: newEng.id,
      engineer_name: newEng.name
    });
    assert.ok(rfqWithEng.id);
    assert.equal(rfqWithEng.engineer_id, newEng.id);
    assert.equal(rfqWithEng.engineer_name, "Rajesh Kulkarni Master");

    // Verify listed RFQ returns engineer_id and engineer_name
    const found = RFQService.list().find(r => r.id === rfqWithEng.id);
    assert.equal(found.engineer_id, newEng.id);
    assert.equal(found.engineer_name, "Rajesh Kulkarni Master");

    // Update engineer on RFQ
    const eng2 = EngineerService.create("Pooja Sharma Master");
    const updated = RFQService.update(rfqWithEng.id, {
      engineer_id: eng2.id,
      engineer_name: eng2.name
    });
    assert.equal(updated.engineer_id, eng2.id);
    assert.equal(updated.engineer_name, "Pooja Sharma Master");
  });

  await t.test("No. of ckt and Volume strictly accept numbers only and strip letters/text", () => {
    const r = RFQService.create({
      no_of_ckt: "88 circuits",
      volume: "15,000 units"
    });
    assert.equal(r.no_of_ckt, 88);
    assert.equal(r.volume, 15000);

    const updated = RFQService.update(r.id, {
      no_of_ckt: "120 ckt",
      volume: "25000 vol"
    });
    assert.equal(updated.no_of_ckt, 120);
    assert.equal(updated.volume, 25000);
  });

  await t.test("Query Type options support proposal, query, query>proposal", () => {
    for (const qType of ["proposal", "query", "query>proposal"]) {
      const r = RFQService.create({
        query_type: qType
      });
      assert.equal(r.query_type, qType);

      const updated = RFQService.update(r.id, {
        query_type: "proposal"
      });
      assert.equal(updated.query_type, "proposal");
    }
  });

  await t.test("Soft deleting an RFQ preserves unique number, sets is_deleted=1, and strictly blocks restore and update", () => {
    const nextNum = RFQService.generateNextNumber();
    const rfq = RFQService.create({
      rfq_number: nextNum,
      sr_no: nextNum,
      unique_rfq_no: nextNum,
      remark: "Initial remark"
    });
    assert.ok(rfq.id);
    assert.equal(rfq.rfq_number, nextNum);

    // Soft delete
    const deleted = RFQService.softDelete(rfq.id);
    assert.equal(deleted.is_deleted, 1);
    // Unique number is NOT deleted!
    assert.equal(deleted.rfq_number, nextNum);
    assert.equal(deleted.sr_no, nextNum);

    // Verify it still exists in list() with is_deleted=1
    const listed = RFQService.list().find(r => r.id === rfq.id);
    assert.ok(listed);
    assert.equal(listed.is_deleted, 1);
    assert.equal(listed.rfq_number, nextNum);

    // Next number generation still accounts for it so sequence never clashes
    const followingNum = RFQService.generateNextNumber();
    assert.notEqual(followingNum, nextNum);

    // Restore is strictly blocked!
    assert.throws(
      () => RFQService.restore(rfq.id),
      /Restoring deleted RFQ records is not permitted/
    );

    // Update is strictly blocked!
    assert.throws(
      () => RFQService.update(rfq.id, { remark: "Attempted update on deleted row" }),
      /Cannot update a deleted RFQ record/
    );
  });

  await t.test("RFQ create_ecn option creates autofilled ECN in ECN sheet when checked, and does nothing when unchecked", () => {
    const cust = CustomerService.create("Tata Motors ECN Check");
    const rfqNum = RFQService.generateNextNumber();

    // RFQ created without create_ecn
    const rfqWithoutEcn = RFQService.create({
      rfq_number: rfqNum,
      customer_name: cust.name,
      model: "Nexon EV",
      no_of_ckt: 45,
      volume: 8000,
      create_ecn: false
    });
    const ecnsBefore = ECNService.list().filter(e => e.rfq_no === rfqNum);
    assert.equal(ecnsBefore.length, 0);

    // RFQ created with create_ecn: true
    const nextRfqNum = RFQService.generateNextNumber();
    const rfqWithEcn = RFQService.create({
      rfq_number: nextRfqNum,
      customer_name: cust.name,
      model: "Harrier EV",
      query_status: "Open",
      unique_list_share_date: "2026-05-01",
      unique_rfq_no: nextRfqNum,
      unique_status: "Open",
      no_of_ckt: 72,
      volume: 12000,
      work_start_date: "2026-05-05",
      target_date: "2026-05-20",
      completion_date: "2026-05-18",
      overall_rfq_status: "Open",
      create_ecn: true
    });
    assert.ok(rfqWithEcn.id);

    // Verify ECN was immediately created in ECN sheet with matching fields
    const createdEcns = ECNService.list().filter(e => e.rfq_no === nextRfqNum);
    assert.equal(createdEcns.length, 1);
    const ecn = createdEcns[0];
    assert.ok(ecn.ecn_number.startsWith("ECN-"));
    assert.equal(ecn.stage, "sample");
    assert.equal(ecn.customer_name, cust.name);
    assert.equal(ecn.model_name, "Harrier EV");
    assert.equal(ecn.query_status, "Open");
    assert.equal(ecn.unique_list_share_date, "2026-05-01");
    assert.equal(ecn.unique_rfq_no, nextRfqNum);
    assert.equal(ecn.unique_status, "Open");
    assert.equal(ecn.no_of_ckt, 72);
    assert.equal(ecn.volume, 12000);
    assert.equal(ecn.work_start_date, "2026-05-05");
    assert.equal(ecn.target_date, "2026-05-20");
    assert.equal(ecn.completion_date, "2026-05-18");
    assert.equal(ecn.overall_status, "Open");
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

  await t.test("ECN Tracker 23 columns persist, list in sequence, update inline, and soft-delete", () => {
    const nextEcnNum = ECNService.generateNextNumber();
    const ecn = ECNService.create({
      ecn_number: nextEcnNum,
      rfq_no: "RFQ99999",
      stage: "modification",
      customer_name: "Mahindra",
      model_name: "XUV700",
      query_status: "Open",
      unique_list_share_date: "2026-06-01",
      unique_rfq_no: "RFQ99999",
      unique_status: "Open",
      sap_bom_upload_date: "2026-06-05",
      sap_bom_released_date: "2026-06-08",
      prd_bom_release_date: "2026-06-10",
      label_upload_date: "2026-06-12",
      min_by_engineer_date: "2026-06-15",
      min_by_ppc: "2026-06-16",
      min_status: "Pending",
      review: "All sample tests passed",
      overall_status: "In Progress",
      no_of_ckt: 94,
      volume: 25000,
      work_start_date: "2026-06-01",
      target_date: "2026-06-25",
      actual_date: "2026-06-20"
    });
    assert.ok(ecn.id);
    assert.equal(ecn.stage, "modification");
    assert.equal(ecn.sap_bom_upload_date, "2026-06-05");
    assert.equal(ecn.min_status, "Pending");

    // Inline update
    const updated = ECNService.update(ecn.id, {
      stage: "design vave",
      min_status: "Close",
      review: "Design VAVE approved",
      overall_status: "Close"
    });
    assert.equal(updated.stage, "design vave");
    assert.equal(updated.min_status, "Close");
    assert.equal(updated.review, "Design VAVE approved");

    // Soft delete
    const deleted = ECNService.softDelete(ecn.id);
    assert.equal(deleted.is_deleted, 1);

    // List excludes soft-deleted ECN
    const foundInList = ECNService.list().find(e => e.id === ecn.id);
    assert.equal(foundInList, undefined);
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
