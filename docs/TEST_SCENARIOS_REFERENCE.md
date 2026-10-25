# 45 Engineering Tracker — Test Scenarios Matrix

> **Testing Reference Sheet & Poka-Yoke Validation Guide**  
> **Last Synchronized:** 2026-10-25  
> **Total Scenarios:** 36 (Automated Poka-Yoke Tests: 31, System & UI Tests: 5)  
> 
> **Downloadable Testing Spreadsheets:**
> * 📊 [Harness_Engineering_Tracker_Test_Scenarios_Matrix.xlsx](file:///D:/HARNESS-TRACKER/docs/Harness_Engineering_Tracker_Test_Scenarios_Matrix.xlsx)
> * 📊 [Harness_Engineering_Tracker_Test_Scenarios_Matrix.xls](file:///D:/HARNESS-TRACKER/docs/Harness_Engineering_Tracker_Test_Scenarios_Matrix.xls)

---

## 📌 Column Specification (Matching Standard)
| Column Name | Description |
| :--- | :--- |
| **ID** | Unique scenario identifier (`MD-01`, `RC-01`, `RFQ-01`, `ECN-01`, `BOM-01`, `KIT-01`, `UI-01`) |
| **Module** | Functional module within the Harness Engineering Tracker |
| **Platform** | Target execution platform (`Web App Desktop / Tablet`) |
| **Role / login** | Persona testing the workflow (`Design Engineer`, `Costing Engineer`, `PPC Lead`, `System Admin`) |
| **Priority** | Priority level (`P1` = Core Poka-Yoke / Critical Gate; `P2` = Secondary Workflow / UI Feature) |
| **Scenario** | High-level summary of what is being tested |
| **Preconditions** | Starting system state and database requirements |
| **Steps** | Numbered instructions to execute the test |
| **Expected result** | Verifiable success criteria, exact error messages, and Poka-Yoke enforcement |
| **Assigned tester** | Assigned quality assurance engineer (`Tester 1`) |
| **Status** | Execution status (`Pass` / `Not Started` / `Fail`) |
| **Tested on** | Execution date timestamp (`2026-10-25`) |
| **Device / browser** | Environment details (`Windows 11 / Chrome / Edge`) |
| **Notes** | Architecture logic, Poka-Yoke gate rule, and business compliance notes |
| **Bug / evidence link** | Reference ticket, video, or screenshot artifact |

---

## 📋 Comprehensive Test Matrix Table

| ID | Module | Pri | Role | Scenario | Expected Result / Poka-Yoke Rule | Status |
| :---: | :--- | :---: | :--- | :--- | :--- | :---: |
| **MD-01** | Master Data & Hierarchy | **P1** | System Admin / Engineering Lead | Customer creation, duplicate rejection (case-insensitive), and historical deactivation | Poka-Yoke: Case-insensitive unique constraint prevents duplicate customer silos. | `Pass` |
| **MD-02** | Master Data & Hierarchy | **P1** | Design Engineer | Identical model names under different customers remain strictly separate projects | Poka-Yoke: Composite unique constraint UNIQUE(customer_id, model_name) ensures model scoping per customer. | `Pass` |
| **MD-03** | Master Data & Hierarchy | **P1** | Design Engineer | Global harness number company-wide uniqueness enforcement | Poka-Yoke: Global unique constraint on harness_number across the entire company database. | `Pass` |
| **RC-01** | Revision Control | **P1** | Design Engineer | Harness multi-revision recording and historical revision immutability | Traceability: Each revision retains its distinct drawing, volume, and SOP metadata. | `Pass` |
| **RC-02** | Revision Control | **P1** | Design Engineer | Second Active revision creation strict blocking (Single Active Revision Poka-Yoke) | Poka-Yoke Gate: Prevents production line and ERP from ever seeing two competing active drawings. | `Pass` |
| **RC-03** | Revision Control | **P1** | Design Engineer | Activating new revision succeeds after manual obsolescence of prior active revision | Controlled Revision Handover: Requires intentional obsolescence before commissioning new active rev. | `Pass` |
| **RFQ-01** | RFQ Tracker | **P1** | Costing Engineer / Design Lead | Unresolved customer query strictly blocks Costing BOM submission date recording | Poka-Yoke Gate: Zero costing estimates can be sent to customers with pending technical ambiguities. | `Pass` |
| **RFQ-02** | RFQ Tracker | **P1** | Costing Engineer / Design Lead | Costing BOM submission permitted immediately upon query resolution | Workflow Gate Cleared: Valid technical baseline confirmed for commercial quotation. | `Pass` |
| **RFQ-DATE-01** | RFQ Tracker | **P1** | Design Engineer / Marketing Lead | Design Input Received Date cannot be earlier than Marketing Input Received Date | Poka-Yoke Gate: Enforces chronological sequence between Marketing input handover and Design engineering receipt. | `Pass` |
| **RFQ-DATE-02** | RFQ Tracker | **P1** | Costing Engineer | Costing BOM Shared Date cannot be earlier than Costing BOM Prepare Date | Poka-Yoke Gate: Enforces chronological sequence ensuring Costing BOM is prepared before it can be shared with customer/management. | `Pass` |
| **RFQ-03** | RFQ Tracker | **P1** | Design Engineer | All 25 RFQ Tracker columns persist, support custom overrides and update | Full DESPL RFQ Tracker Schema Compliance: 25 distinct engineering columns. | `Pass` |
| **RFQ-04** | RFQ Tracker | **P1** | Design Engineer | RFQ sequential auto-numbering generation format 'RFQ618260001' and sequential incrementing | Auto-Numbering Standard: 13-character deterministic format with 4-digit sequential padding. | `Pass` |
| **RFQ-05** | RFQ Tracker | **P1** | Design Engineer | Unconstrained free-text fields for Part No, Customer Rev, FG Code, FG Rev, Description | Engineering Freedom: Allows quoting legacy, prototype, or customer-specific nomenclature freely. | `Pass` |
| **RFQ-06** | RFQ Tracker | **P2** | Design Engineer | Drawing Number and Model columns persist, list, and update | Blueprinting: Directly links commercial RFQ to customer drawing number. | `Pass` |
| **RFQ-07** | RFQ Tracker | **P2** | Design Engineer | Customer Name and Review Note columns persist, list, and update | Meeting Audit Trail: Stores customer discussion minutes and technical remarks. | `Pass` |
| **RFQ-08** | RFQ Tracker | **P1** | Design Engineer | Overall RFQ Status strict dependency on sub-milestone statuses (Query, Unique, Costing) | Poka-Yoke Gate: Overall RFQ closure requires 100% completion across all three sub-milestones. | `Pass` |
| **RFQ-09** | RFQ Tracker | **P1** | Design Engineer | Target Date and Actual Date cannot be earlier than Start Date, but can be the same date (Poka-Yoke) | Poka-Yoke Gate: Eliminates negative project timeline entries while supporting same-day milestones. | `Pass` |
| **RFQ-10** | RFQ Tracker | **P2** | Design Engineer | Engineer Assignment linked with Engineer Master directory | Relational integrity: engineer_id foreign key ensures reporting consistency. | `Pass` |
| **RFQ-11** | RFQ Tracker | **P2** | Design Engineer | Circuit Count and Volume numeric sanitization (stripping non-digit characters) | Data Sanitization: Protects reporting and sorting algorithms from parse errors. | `Pass` |
| **AUTO-20** | Automated Suite | **P1** | Design / QA Engineer | Query Type options support proposal, query, query>proposal, and query & proposal | Auto-synced from scripts/test_poka_yoke.mjs | `Pass` |
| **AUTO-21** | Automated Suite | **P1** | Design / QA Engineer | Soft deleting an RFQ preserves unique number, sets is_deleted=1, allows recovery/restore and blocks update without restore | Auto-synced from scripts/test_poka_yoke.mjs | `Pass` |
| **RFQ-14** | RFQ Tracker | **P1** | Design Engineer | Automatic ECN creation triggered by RFQ 'create_ecn' checkbox | Seamless Pipeline: Bridges commercial RFQ approval straight into technical ECN execution. | `Pass` |
| **AUTO-23** | Automated Suite | **P1** | Design / QA Engineer | Updating an RFQ simultaneously synchronizes linked ECN records except Start, Target, and Actual Dates | Auto-synced from scripts/test_poka_yoke.mjs | `Pass` |
| **ECN-01** | ECN Workflow | **P1** | Design Engineer | Mandatory Change/Reason validation on ECN creation | Poka-Yoke: Unjustified engineering changes cannot be initiated. | `Pass` |
| **ECN-02** | ECN Workflow | **P1** | Design Engineer | Costing Required demands mandatory linked RFQ | Poka-Yoke: Prevents unquoted cost-bearing changes from proceeding without an approved RFQ. | `Pass` |
| **ECN-03** | ECN Workflow | **P1** | Engineering Lead | Primary Engineer reassignment strictly locked once Work Start Date is recorded | Poka-Yoke: Locks accountability to original assigned engineer; additional help must use Support Engineer field. | `Pass` |
| **ECN-04** | ECN Workflow | **P1** | Design Engineer | Mandatory Delay Reason when MIN Meeting Date exceeds Target Date | Poka-Yoke Gate: Enforces transparent accountability for schedule slippages. | `Pass` |
| **ECN-05** | ECN Workflow | **P2** | Design Engineer | ECN Tracker 23 columns persist, list in sequence, update inline, and soft-delete | Full ECN Lifecycle: Handles sample, modification, pilot, and design VAVE stages seamlessly. | `Pass` |
| **BOM-01** | SAP BOM & Labels | **P1** | BOM / PPC Engineer | Sequential alternate validation per FG Code ('01' -> '02' -> '03', skipping blocked) | Poka-Yoke: Eliminates broken BOM revision sequences in SAP ERP. | `Pass` |
| **BOM-02** | SAP BOM & Labels | **P1** | Quality / Packaging Engineer | Label upload strictly blocked before official BOM release date is stamped | Poka-Yoke Gate: Labeling / barcoding can never precede an authorized and frozen Bill of Materials. | `Pass` |
| **KIT-02** | MIN & Kit List | **P1** | PPC Lead / Store Manager | Recording MIN meeting concludes ECN and permits Consolidated Kit generation and physical rack filing | End-to-End Handover: Concludes engineering change and files physical/digital production kit. | `Pass` |
| **MD-04** | Master Data & Hierarchy | **P2** | Engineering Lead | Engineer Master creation, active toggle, and assignment dropdown linkage | Master Data relational integrity: Linked via engineer_id foreign key with engineer_name fallback. | `Pass` |
| **UI-01** | UI & Theme Settings | **P2** | All Users | Dark Theme and Light Theme instant switching and localStorage persistence | Accessibility & Ergonomics: Dual-theme support adhering to DESPL specifications. | `Pass` |
| **UI-02** | Project Kit List | **P1** | Program Manager / Customer Lead | Clean Project Kit List (Tab 6): Consolidated Customer Portfolio vs. Individual Customer Filter | User Feedback Addressed: Replaced busy widget cards with simple, direct tabular sheet switcher. | `Pass` |
| **UI-03** | Project Kit List | **P2** | Design Engineer | Zero Hardcoded Mock Data Guarantee across all views and tables | Clean Slate: Production-ready clean database with no seed artifacts. | `Pass` |
| **UI-04** | Export & Compliance | **P2** | Program Manager / Quality Lead | Excel export functionality for RFQ Sheet, ECN Sheet, and Kit List | ERP Interoperability: Facilitates offline audit and customer submission. | `Pass` |

---

### 💡 How to Update This Sheet in the Future
Whenever you make changes to test cases or codebase workflows, run:
```bash
npm run update-tests
```
This single command re-scans `scripts/test_poka_yoke.mjs`, synchronizes all test scenarios, and re-generates both `.xlsx`, `.xls`, and this markdown reference document.
