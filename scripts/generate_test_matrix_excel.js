import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const docsDir = path.join(process.cwd(), "docs");
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

const testScenarios = [
  // --- MASTER DATA & HIERARCHY ---
  {
    id: "MD-01",
    module: "Master Data & Hierarchy",
    platform: "Web App (Desktop / Tablet)",
    role: "System Admin / Engineering Lead",
    priority: "P1",
    scenario: "Customer creation, duplicate rejection (case-insensitive), and historical deactivation",
    preconditions: "User has access to Master Data configuration panel",
    steps: "1. Navigate to Master Data -> Customers tab.\n2. Click '+ Add Customer' and enter name 'Tata Motors Test'.\n3. Save and verify customer appears in the list.\n4. Click '+ Add Customer' again and enter 'tata motors test' (different case).\n5. Observe system validation message.\n6. Select 'Tata Motors Test' and toggle is_active to inactive (0).\n7. Verify customer is marked inactive without deleting past historical references.",
    expected: "1. Customer is created successfully with active status.\n2. System rejects case-insensitive duplicate with error: 'Customer already exists'.\n3. Deactivation successfully sets is_active = 0 while preserving all historical project and harness records.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke: Case-insensitive unique constraint prevents duplicate customer silos.",
    bug_link: ""
  },
  {
    id: "MD-02",
    module: "Master Data & Hierarchy",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "Identical model names under different customers remain strictly separate projects",
    preconditions: "Customers 'OEM Alpha' and 'OEM Beta' exist in customer master",
    steps: "1. Under customer 'OEM Alpha', create a project with Model Name 'Model-X'.\n2. Under customer 'OEM Beta', create a project with the same Model Name 'Model-X'.\n3. View Project Master and Project Kit List filters.\n4. Verify project IDs, customer foreign keys, and model associations.",
    expected: "Both projects are created successfully with unique IDs (e.g. projA.id !== projB.id). OEM Alpha's Model-X and OEM Beta's Model-X remain isolated and distinct across all tracker sheets.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke: Composite unique constraint UNIQUE(customer_id, model_name) ensures model scoping per customer.",
    bug_link: ""
  },
  {
    id: "MD-03",
    module: "Master Data & Hierarchy",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "Global harness number company-wide uniqueness enforcement",
    preconditions: "Project 'Scorpio-EV' exists under customer 'Mahindra OEM'",
    steps: "1. Create a new harness under 'Scorpio-EV' with Harness Number 'GLOBAL-HARN-001'.\n2. Attempt to create another harness under a different project/customer with number 'global-harn-001' or 'GLOBAL-HARN-001'.\n3. Verify response from system.",
    expected: "1. First harness is created successfully.\n2. Second harness creation is strictly rejected with error: 'Harness number already exists in the company'.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke: Global unique constraint on harness_number across the entire company database.",
    bug_link: ""
  },
  {
    id: "MD-04",
    module: "Master Data & Hierarchy",
    platform: "Web App (Desktop / Tablet)",
    role: "Engineering Lead",
    priority: "P2",
    scenario: "Engineer Master creation, active toggle, and assignment dropdown linkage",
    preconditions: "User has access to Master Data -> Engineers panel",
    steps: "1. Click '+ Add Engineer' and enter 'Rajesh Kulkarni'.\n2. Verify engineer appears in Master Engineer directory.\n3. Open RFQ Tracker or ECN Tracker creation modal.\n4. Open 'Assigned Engineer' dropdown and verify 'Rajesh Kulkarni' is selectable.\n5. Select engineer and save record.",
    expected: "Engineer is added to Master Data and immediately available across RFQ and ECN assignment dropdowns.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Master Data relational integrity: Linked via engineer_id foreign key with engineer_name fallback.",
    bug_link: ""
  },

  // --- REVISION CONTROL & SINGLE-ACTIVE POKA-YOKE ---
  {
    id: "RC-01",
    module: "Revision Control",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "Harness multi-revision recording and historical revision immutability",
    preconditions: "Harness 'HARN-REV-TEST-01' exists",
    steps: "1. Create Revision 'A' for the harness with SOP 'SOP-001', volume 5000, circuit count 50, and status 'Obsolete'.\n2. Create Revision 'B' for the same harness with SOP 'SOP-002', volume 7500, circuit count 55, and status 'Active'.\n3. View Revision list for harness.",
    expected: "Both revisions exist under the harness. Revision A preserves its historical specifications (50 circuits, 5000 volume) while Revision B reflects the active engineering baseline.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Traceability: Each revision retains its distinct drawing, volume, and SOP metadata.",
    bug_link: ""
  },
  {
    id: "RC-02",
    module: "Revision Control",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "Second Active revision creation strict blocking (Single Active Revision Poka-Yoke)",
    preconditions: "Harness 'HARN-REV-TEST-01' already has Revision 'B' in 'Active' status",
    steps: "1. Attempt to create Revision 'C' with status set to 'Active'.\n2. Submit the form.\n3. Observe the validation modal / notification.",
    expected: "System strictly blocks submission and displays error: 'Cannot activate Revision C because Revision B is still Active. Only one Active revision is allowed per harness at any given time.'",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke Gate: Prevents production line and ERP from ever seeing two competing active drawings.",
    bug_link: ""
  },
  {
    id: "RC-03",
    module: "Revision Control",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "Activating new revision succeeds after manual obsolescence of prior active revision",
    preconditions: "Harness has Revision 'B' (Active)",
    steps: "1. Select Revision 'B' and change its status from 'Active' to 'Obsolete'.\n2. Save change.\n3. Now create or update Revision 'C' with status set to 'Active'.\n4. Submit and verify revision list.",
    expected: "Revision 'C' successfully activates. Revision list shows: Revision 'B' = Obsolete, Revision 'C' = Active.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Controlled Revision Handover: Requires intentional obsolescence before commissioning new active rev.",
    bug_link: ""
  },

  // --- RFQ TRACKER & QUERY BLOCKING VALIDATION ---
  {
    id: "RFQ-01",
    module: "RFQ Tracker",
    platform: "Web App (Desktop / Tablet)",
    role: "Costing Engineer / Design Lead",
    priority: "P1",
    scenario: "Unresolved customer query strictly blocks Costing BOM submission date recording",
    preconditions: "An RFQ record has Query Yes/No = 'Yes' and Query Status = 'Open'",
    steps: "1. Open the RFQ row or editing modal.\n2. Attempt to fill in 'Costing BOM Submitted Date' (e.g. '2026-03-01').\n3. Click Save.\n4. Observe validation check.",
    expected: "Action is strictly rejected with error message: 'Cannot record Costing BOM Submitted Date while an unresolved query exists. Please mark the query as Resolved before submitting Costing BOM.'",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke Gate: Zero costing estimates can be sent to customers with pending technical ambiguities.",
    bug_link: ""
  },
  {
    id: "RFQ-02",
    module: "RFQ Tracker",
    platform: "Web App (Desktop / Tablet)",
    role: "Costing Engineer / Design Lead",
    priority: "P1",
    scenario: "Costing BOM submission permitted immediately upon query resolution",
    preconditions: "RFQ record has Query Yes/No = 'Yes' and Query Status changed to 'Resolved' or 'Close'",
    steps: "1. Mark Query Status as 'Resolved'.\n2. Enter 'Costing BOM Submitted Date' as '2026-03-01'.\n3. Click Save.",
    expected: "System saves record successfully. Costing BOM submitted date is logged with timestamp and author.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Workflow Gate Cleared: Valid technical baseline confirmed for commercial quotation.",
    bug_link: ""
  },
  {
    id: "RFQ-03",
    module: "RFQ Tracker",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "RFQ sequential auto-numbering generation format 'RFQ618260001' and sequential incrementing",
    preconditions: "User opens New RFQ form",
    steps: "1. Check the pre-generated RFQ Number in the form.\n2. Verify format matches regex ^RFQ61826\\d{4}$.\n3. Submit first RFQ.\n4. Open New RFQ form again and inspect next generated number.\n5. Submit second RFQ.\n6. Compare sequential serial numbers.",
    expected: "Numbers generate sequentially (e.g. RFQ618260001 -> RFQ618260002 -> RFQ618260003) with zero duplicates or gaps.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Auto-Numbering Standard: 13-character deterministic format with 4-digit sequential padding.",
    bug_link: ""
  },
  {
    id: "RFQ-04",
    module: "RFQ Tracker",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "Unconstrained free-text fields for Part No, Customer Rev, FG Code, FG Rev, Description",
    preconditions: "User is creating an early-stage RFQ without existing master records",
    steps: "1. In Harness Part Number enter numeric-only '9988776655'.\n2. In Customer Revision enter '100'.\n3. In FG Code enter '55555'.\n4. In Description enter '987654'.\n5. Save and verify row.\n6. Create another RFQ with special characters: 'CUSTOM / SPECIAL #12-AB', 'RELEASE-CANDIDATE-X'.\n7. Save and verify row.",
    expected: "System accepts pure numbers, pure text, slashes, hashes, dashes, and spaces with zero regex/format restrictions.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Engineering Freedom: Allows quoting legacy, prototype, or customer-specific nomenclature freely.",
    bug_link: ""
  },
  {
    id: "RFQ-05",
    module: "RFQ Tracker",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "End Date strictly greater than Starting Date validation (Target Date & Actual Date Poka-Yoke)",
    preconditions: "User is creating or updating an RFQ",
    steps: "1. Set Work Start Date to '2026-05-10'.\n2. Set Target Date to '2026-05-10' (same day) and try to save.\n3. Observe error message.\n4. Set Target Date to '2026-05-09' (earlier date) and try to save.\n5. Observe error message.\n6. Set Target Date to '2026-05-20' and Actual Date to '2026-05-08' (earlier than start date) and try to save.\n7. Observe error message.\n8. Set Target Date to '2026-05-20' and Actual Date to '2026-05-18' and save.",
    expected: "1. Same-day Target Date rejected: 'Target Date (2026-05-10) must be greater than Start Date (2026-05-10)'.\n2. Earlier Target Date rejected.\n3. Earlier Actual Date rejected.\n4. Valid dates strictly greater than start date save successfully.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke Gate: Eliminates nonsensical or negative project timeline entries.",
    bug_link: ""
  },
  {
    id: "RFQ-06",
    module: "RFQ Tracker",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "Overall RFQ Status strict dependency on sub-milestone statuses (Query, Unique, Costing)",
    preconditions: "RFQ record has Query Status = 'Open', Unique Status = 'Close', Costing BOM Status = 'Close'",
    steps: "1. Open RFQ and attempt to change Overall Status to 'Close'.\n2. Submit update.\n3. Observe system rejection.\n4. Test again with Query Status = 'Close', Unique Status = 'Open', Costing BOM Status = 'Close'.\n5. Test again with Costing BOM Status = 'Open'.",
    expected: "In all cases where any milestone is not 'Close', system strictly blocks setting Overall Status to 'Close' with: 'Cannot set Overall status to Close because other milestone columns are still open'.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke Gate: Overall RFQ closure requires 100% completion across all three sub-milestones.",
    bug_link: ""
  },
  {
    id: "RFQ-07",
    module: "RFQ Tracker",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "Automatic Overall RFQ Status closure and reversion based on milestone transitions",
    preconditions: "RFQ record has Query Status = 'Close', Unique Status = 'Close', Costing BOM Status = 'Open' (Overall is 'Open')",
    steps: "1. Update Costing BOM Status to 'Close'.\n2. Save record and inspect Overall Status.\n3. Now edit Costing BOM Status back to 'Open' or 'In Progress'.\n4. Save and inspect Overall Status.",
    expected: "1. When last open sub-column changes to 'Close', Overall Status automatically transitions to 'Close'.\n2. When any closed sub-column is reopened, Overall Status automatically reverts to 'Open'.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Automatic Milestone State Machine: Ensures executive dashboard status is always 100% synchronized.",
    bug_link: ""
  },
  {
    id: "RFQ-08",
    module: "RFQ Tracker",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P2",
    scenario: "Circuit Count and Volume numeric sanitization (stripping non-digit characters)",
    preconditions: "User enters alphanumeric inputs in numeric fields",
    steps: "1. In No. of ckt input enter '88 circuits'.\n2. In Annual Volume input enter '15,000 units'.\n3. Save RFQ.\n4. View saved record in RFQ Tracker table.",
    expected: "System cleans inputs automatically: No. of ckt stores as 88, Volume stores as 15000.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Data Sanitization: Protects reporting and sorting algorithms from parse errors.",
    bug_link: ""
  },
  {
    id: "RFQ-09",
    module: "RFQ Tracker",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P2",
    scenario: "Query Type dropdown options validation (proposal, query, query>proposal)",
    preconditions: "User is editing RFQ query classification",
    steps: "1. Set Query Type to 'proposal' and save.\n2. Set Query Type to 'query' and save.\n3. Set Query Type to 'query>proposal' and save.",
    expected: "All three standard industry classifications persist accurately and display with corresponding badge colors.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Classification: Distinguishes between customer inquiries and internal design proposals.",
    bug_link: ""
  },
  {
    id: "RFQ-10",
    module: "RFQ Tracker",
    platform: "Web App (Desktop / Tablet)",
    role: "Engineering Manager",
    priority: "P1",
    scenario: "Soft-deleting an RFQ preserves unique number, sets is_deleted=1, and strictly blocks restore and update",
    preconditions: "An RFQ with number 'RFQ618260001' exists",
    steps: "1. Click Delete action on the RFQ.\n2. Confirm deletion.\n3. Check database record.\n4. Attempt to update the deleted RFQ via API or UI.\n5. Attempt to restore the deleted RFQ.\n6. Generate next RFQ number.",
    expected: "1. Row is marked is_deleted = 1 but unique rfq_number and sr_no are preserved forever.\n2. Update attempt is rejected: 'Cannot update a deleted RFQ record'.\n3. Restore attempt is rejected: 'Restoring deleted RFQ records is not permitted'.\n4. Next number generation skips the deleted number so sequence never collides.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Audit Trail Protection: Deleted numbers can never be recycled or overwritten.",
    bug_link: ""
  },
  {
    id: "RFQ-11",
    module: "RFQ Tracker",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "Automatic ECN creation triggered by RFQ 'create_ecn' checkbox",
    preconditions: "User is creating an RFQ for Customer 'Tata Motors' and Model 'Harrier EV'",
    steps: "1. Fill in RFQ details: No of ckt = 72, Volume = 12000, Start Date = 2026-05-05, Target Date = 2026-05-20.\n2. Check the 'Create ECN' checkbox.\n3. Submit RFQ.\n4. Navigate to ECN Tracker (Tab 2 or Tab 6 ECN Sheet).\n5. Locate newly created ECN.",
    expected: "An ECN is automatically generated with prefix 'ECN-', stage='sample', customer_name='Tata Motors', model_name='Harrier EV', no_of_ckt=72, volume=12000, linked rfq_no=RFQ number, and matching target dates.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Seamless Pipeline: Bridges commercial RFQ approval straight into technical ECN execution.",
    bug_link: ""
  },
  {
    id: "RFQ-12",
    module: "RFQ Tracker",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P2",
    scenario: "Drawing Number, Model, Customer Name, and Review Note columns persistence and inline update",
    preconditions: "RFQ record exists",
    steps: "1. Enter Drawing Number 'DWG-2026-X99', Model 'Curvv-EV', Customer Name 'Mahindra & Mahindra', Review Note 'Initial review completed'.\n2. Save record.\n3. Reload page.\n4. Edit inline to Drawing 'DWG-2026-X100', Model 'Curvv-EV-Phase2', Customer 'Tata Motors Commercial', Review Note 'Updated review after costing'.\n5. Save and reload.",
    expected: "All 4 fields persist and reflect inline changes accurately in both desktop and mobile view.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Data Persistence: Full support for 25 columns matching DESPL Excel RFQ Master Tracker.",
    bug_link: ""
  },

  // --- ECN WORKFLOW & ASSIGNMENT LOCKING POKA-YOKE ---
  {
    id: "ECN-01",
    module: "ECN Workflow",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "Mandatory Change/Reason validation on ECN creation",
    preconditions: "User opens New ECN modal",
    steps: "1. Select harness and source revision.\n2. Leave 'Change / Reason' input blank or whitespace only.\n3. Attempt to save ECN.",
    expected: "Form submission is blocked and system displays error: 'Change/Reason is mandatory before submitting an ECN.'",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke: Unjustified engineering changes cannot be initiated.",
    bug_link: ""
  },
  {
    id: "ECN-02",
    module: "ECN Workflow",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "Costing Required demands mandatory linked RFQ",
    preconditions: "User is creating an ECN with Costing Required = 'Yes'",
    steps: "1. Select Costing Required = 'Yes'.\n2. Leave Related RFQ unselected (null).\n3. Attempt to submit ECN.",
    expected: "Submission blocked with error: 'A related RFQ is mandatory when Costing Required is Yes. Please link an RFQ.'",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke: Prevents unquoted cost-bearing changes from proceeding without an approved RFQ.",
    bug_link: ""
  },
  {
    id: "ECN-03",
    module: "ECN Workflow",
    platform: "Web App (Desktop / Tablet)",
    role: "Engineering Lead",
    priority: "P1",
    scenario: "Primary Engineer reassignment allowed before Work Start Date",
    preconditions: "ECN created with Primary Engineer 'Eng Primary' and Work Start Date is null/empty",
    steps: "1. Open ECN for editing.\n2. Change Primary Engineer to 'Eng Secondary'.\n3. Save change.",
    expected: "System accepts modification. ECN Primary Engineer updates to 'Eng Secondary'.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Pre-Work Flexibility: Leadership can balance workload before engineering labor begins.",
    bug_link: ""
  },
  {
    id: "ECN-04",
    module: "ECN Workflow",
    platform: "Web App (Desktop / Tablet)",
    role: "Engineering Lead",
    priority: "P1",
    scenario: "Primary Engineer reassignment strictly locked once Work Start Date is recorded",
    preconditions: "ECN has Work Start Date recorded (e.g. '2026-03-10')",
    steps: "1. Open the ECN.\n2. Attempt to reassign Primary Engineer to a different engineer.\n3. Save change.\n4. Observe validation response.",
    expected: "Reassignment is strictly blocked with error: 'Primary Engineer cannot be reassigned after Work Start Date. Support Engineer may be added instead.'",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke: Locks accountability to original assigned engineer; additional help must use Support Engineer field.",
    bug_link: ""
  },
  {
    id: "ECN-05",
    module: "ECN Workflow",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P1",
    scenario: "Mandatory Delay Reason when MIN Meeting Date exceeds Target Date",
    preconditions: "ECN has Target Date = '2026-04-01'",
    steps: "1. Record MIN Meeting Date as '2026-04-10' (9 days late).\n2. Leave Delay Reason blank.\n3. Attempt to save.\n4. Observe error.\n5. Enter Delay Reason: 'Waiting for customer tool signoff.'\n6. Save again.",
    expected: "1. Blank delay reason is blocked with error: 'A Delay Reason is mandatory because the MIN Meeting Date exceeds the Target Date'.\n2. Once explanation is provided, record saves successfully.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke Gate: Enforces transparent accountability for schedule slippages.",
    bug_link: ""
  },
  {
    id: "ECN-06",
    module: "ECN Workflow",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P2",
    scenario: "ECN Tracker 23 columns persist, list in sequence, update inline, and soft-delete",
    preconditions: "User opens ECN Tracker",
    steps: "1. Create ECN with stage='modification', sap_bom_upload_date='2026-06-05', min_status='Pending', no_of_ckt=94, volume=25000.\n2. Update inline to stage='design vave', min_status='Close', review='Design VAVE approved', overall_status='Close'.\n3. Verify updated row in table.\n4. Soft-delete the ECN.\n5. Verify ECN is excluded from active tracker list while preserving audit trail.",
    expected: "All 23 DESPL columns save, update inline, and soft-delete accurately.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Full ECN Lifecycle: Handles sample, modification, pilot, and design VAVE stages seamlessly.",
    bug_link: ""
  },

  // --- SAP BOM SEQUENCING & LABEL UPLOAD PREREQUISITE ---
  {
    id: "BOM-01",
    module: "SAP BOM & Labels",
    platform: "Web App (Desktop / Tablet)",
    role: "BOM / PPC Engineer",
    priority: "P1",
    scenario: "Sequential alternate validation per FG Code ('01' -> '02' -> '03', skipping blocked)",
    preconditions: "ECN exists for FG Code 'FG-TEST-99'",
    steps: "1. Upload first BOM for FG-TEST-99 with bom_alternate='01' (or leave blank for auto '01').\n2. Verify BOM Alternate is '01'.\n3. Attempt to upload second BOM for FG-TEST-99 with bom_alternate='03' (skipping '02').\n4. Submit and observe validation error.\n5. Upload with bom_alternate='02'.",
    expected: "1. Alternate '01' succeeds.\n2. Alternate '03' is rejected with error: 'The next expected sequential alternate is 02'.\n3. Alternate '02' succeeds.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke: Eliminates broken BOM revision sequences in SAP ERP.",
    bug_link: ""
  },
  {
    id: "BOM-02",
    module: "SAP BOM & Labels",
    platform: "Web App (Desktop / Tablet)",
    role: "Quality / Packaging Engineer",
    priority: "P1",
    scenario: "Label upload strictly blocked before official BOM release date is stamped",
    preconditions: "BOM uploaded for 'FG-TEST-99' has release_date = null",
    steps: "1. Go to Label Upload section.\n2. Select unreleased BOM.\n3. Attempt to upload label layout file.\n4. Submit upload.",
    expected: "System strictly blocks upload with error: 'Cannot upload label because the BOM has not been released yet. Official BOM release date is required.'",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke Gate: Labeling / barcoding can never precede an authorized and frozen Bill of Materials.",
    bug_link: ""
  },
  {
    id: "BOM-03",
    module: "SAP BOM & Labels",
    platform: "Web App (Desktop / Tablet)",
    role: "Quality / Packaging Engineer",
    priority: "P1",
    scenario: "Label layout upload succeeds immediately upon BOM release signoff",
    preconditions: "BOM for 'FG-TEST-99' is released with official date stamped (e.g. '2026-04-20')",
    steps: "1. Release BOM with release date '2026-04-20'.\n2. Upload label layout with reason 'Initial barcode layout approved'.\n3. Submit upload.",
    expected: "Label layout is accepted, registered, and linked to the released BOM alternate.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Gate Cleared: Safe packaging authorization tied to frozen release date.",
    bug_link: ""
  },

  // --- MIN MEETING & CONSOLIDATED KIT PREREQUISITE ---
  {
    id: "KIT-01",
    module: "MIN & Kit List",
    platform: "Web App (Desktop / Tablet)",
    role: "PPC Lead / Store Manager",
    priority: "P1",
    scenario: "'No MIN, No Kit List entry' rule strictly enforced (Poka-Yoke Gate)",
    preconditions: "ECN exists for harness 'HARN-KIT-01' without an approved MIN meeting record",
    steps: "1. Go to Consolidated Kit List tab.\n2. Attempt to create or register a Kit List entry for this ECN (Rack 'R-01', File 'F-01').\n3. Submit entry.",
    expected: "Submission is strictly rejected with error: 'No MIN, no Kit List entry. An approved MIN meeting is mandatory before generating a kit list entry.'",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Poka-Yoke Gate: Physical harness kits cannot be filed or issued without formal MIN signoff.",
    bug_link: ""
  },
  {
    id: "KIT-02",
    module: "MIN & Kit List",
    platform: "Web App (Desktop / Tablet)",
    role: "PPC Lead / Store Manager",
    priority: "P1",
    scenario: "Recording MIN meeting concludes ECN and permits Consolidated Kit generation and physical rack filing",
    preconditions: "ECN exists for harness 'HARN-KIT-01' (Rev A, SOP-KIT-01, Volume 5000, 60 Circuits)",
    steps: "1. Navigate to MIN Meetings and record meeting on '2026-05-25' with remarks 'Sample harness approved'.\n2. Navigate to Kit List and register entry with Rack Number 'R-01', File Number 'F-01', Location 'Archive Cabinet A'.\n3. View Consolidated Kit List.",
    expected: "Kit entry generates successfully, pulling harness number 'HARN-KIT-01', Revision 'A', SOP 'SOP-KIT-01', Volume 5000, Ckt 60, Rack 'R-01', and File 'F-01'.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "End-to-End Handover: Concludes engineering change and files physical/digital production kit.",
    bug_link: ""
  },

  // --- UI, THEMES & PROJECT KIT LIST ---
  {
    id: "UI-01",
    module: "UI & Theme Settings",
    platform: "Web App (Desktop / Tablet / Mobile)",
    role: "All Users",
    priority: "P2",
    scenario: "Dark Theme and Light Theme instant switching and localStorage persistence",
    preconditions: "Application loaded at http://localhost:3000",
    steps: "1. Check current theme (default is Dark Theme #0B1120).\n2. Click the 'Light' theme button in the sidebar footer.\n3. Verify instant color switch to Light Mode (#F8FAFC, white cards #FFFFFF, dark text #0F172A).\n4. Refresh browser page.\n5. Click 'Dark' theme button and verify instant switch back.",
    expected: "Theme switches immediately without page reload or visual flickering. Preference persists across refreshes in localStorage.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Accessibility & Ergonomics: Dual-theme support adhering to DESPL specifications.",
    bug_link: ""
  },
  {
    id: "UI-02",
    module: "Project Kit List",
    platform: "Web App (Desktop / Tablet)",
    role: "Program Manager / Customer Lead",
    priority: "P1",
    scenario: "Clean Project Kit List (Tab 6): Consolidated Customer Portfolio vs. Individual Customer Filter",
    preconditions: "User navigates to Tab 6 (Project Kit List)",
    steps: "1. With Customer dropdown set to '-- Select Customer --', verify clean Customer Portfolio table is shown.\n2. Select a specific customer (e.g. 'Tata Motors') from the dropdown.\n3. Verify the 3-sheet switcher activates: RFQ Sheet (count), ECN Sheet (count), Kit List (count).\n4. Switch between sheets and verify only records belonging to the selected customer are displayed.",
    expected: "No visual clutter. Clean customer-scoped view showing RFQ, ECN, and Kit List directly.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "User Feedback Addressed: Replaced busy widget cards with simple, direct tabular sheet switcher.",
    bug_link: ""
  },
  {
    id: "UI-03",
    module: "Project Kit List",
    platform: "Web App (Desktop / Tablet)",
    role: "Design Engineer",
    priority: "P2",
    scenario: "Zero Hardcoded Mock Data Guarantee across all views and tables",
    preconditions: "Fresh application instance with cleaned database",
    steps: "1. Inspect Customer Master, Engineer Master, RFQ Tracker, ECN Tracker, and Project Kit List.\n2. Verify that without user input, tables display clean empty states with '+ Add' call-to-actions.\n3. Check input placeholders.\n4. Create genuine records and verify they appear immediately.",
    expected: "Zero dummy/seed data (no hardcoded fake customer names, dummy numbers, or mock entries). Only authentic user records appear.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "Clean Slate: Production-ready clean database with no seed artifacts.",
    bug_link: ""
  },
  {
    id: "UI-04",
    module: "Export & Compliance",
    platform: "Web App (Desktop / Tablet)",
    role: "Program Manager / Quality Lead",
    priority: "P2",
    scenario: "Excel export functionality for RFQ Sheet, ECN Sheet, and Kit List",
    preconditions: "Customer selected in Project Kit List with existing records",
    steps: "1. Click '📥 Export RFQ' button.\n2. Click '📥 Export ECN' button.\n3. Click '📥 Export Kit' button.\n4. Open downloaded files in Microsoft Excel.",
    expected: "Downloads structured `.xlsx` / `.csv` files matching the on-screen customer-filtered dataset with all 25 RFQ and 23 ECN columns intact.",
    assigned_tester: "Tester 1",
    status: "Not Started",
    tested_on: "",
    device_browser: "Windows 11 / Chrome",
    notes: "ERP Interoperability: Facilitates offline audit and customer submission.",
    bug_link: ""
  }
];

// Build Excel Sheet using XLSX library
const wb = XLSX.utils.book_new();

// Format rows for the sheet matching the exact column layout from user image:
// ID | Module | Platform | Role / login | Priority | Scenario | Preconditions | Steps | Expected result | Assigned tester | Status | Tested on | Device / browser | Notes | Bug / evidence link
const sheetData = [
  [
    "ID",
    "Module",
    "Platform",
    "Role / login",
    "Priority",
    "Scenario",
    "Preconditions",
    "Steps",
    "Expected result",
    "Assigned tester",
    "Status",
    "Tested on",
    "Device / browser",
    "Notes",
    "Bug / evidence link"
  ],
  ...testScenarios.map(ts => [
    ts.id,
    ts.module,
    ts.platform,
    ts.role,
    ts.priority,
    ts.scenario,
    ts.preconditions,
    ts.steps,
    ts.expected,
    ts.assigned_tester,
    ts.status,
    ts.tested_on,
    ts.device_browser,
    ts.notes,
    ts.bug_link
  ])
];

const ws = XLSX.utils.aoa_to_sheet(sheetData);

// Set column widths matching the visual layout
ws["!cols"] = [
  { wch: 10 }, // ID
  { wch: 22 }, // Module
  { wch: 24 }, // Platform
  { wch: 26 }, // Role / login
  { wch: 10 }, // Priority
  { wch: 42 }, // Scenario
  { wch: 38 }, // Preconditions
  { wch: 55 }, // Steps
  { wch: 55 }, // Expected result
  { wch: 16 }, // Assigned tester
  { wch: 14 }, // Status
  { wch: 14 }, // Tested on
  { wch: 24 }, // Device / browser
  { wch: 45 }, // Notes
  { wch: 20 }  // Bug / evidence link
];

XLSX.utils.book_append_sheet(wb, ws, "Test Scenarios Matrix");

// Save as .xlsx and .xls
const xlsxPath = path.join(docsDir, "Harness_Engineering_Tracker_Test_Scenarios_Matrix.xlsx");
const xlsPath = path.join(docsDir, "Harness_Engineering_Tracker_Test_Scenarios_Matrix.xls");

XLSX.writeFile(wb, xlsxPath, { bookType: "xlsx" });
XLSX.writeFile(wb, xlsPath, { bookType: "biff8" });

console.log("Successfully generated test scenarios matrix:");
console.log("- XLSX:", xlsxPath);
console.log("- XLS: ", xlsPath);
console.log(`Total Scenarios: ${testScenarios.length}`);
