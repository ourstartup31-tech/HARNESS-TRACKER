# 45 Engineering Tracker — Test Scenarios Matrix

> **Testing Reference Sheet & Poka-Yoke Validation Guide**  
> Generated Excel Files:
> * [Harness_Engineering_Tracker_Test_Scenarios_Matrix.xlsx](file:///d:/HARNESS-TRACKER/docs/Harness_Engineering_Tracker_Test_Scenarios_Matrix.xlsx)
> * [Harness_Engineering_Tracker_Test_Scenarios_Matrix.xls](file:///d:/HARNESS-TRACKER/docs/Harness_Engineering_Tracker_Test_Scenarios_Matrix.xls)

---

## Column Specification (Matching Testing Standard)
| Column Name | Description |
| :--- | :--- |
| **ID** | Unique scenario identifier (e.g., `MD-01`, `RC-01`, `RFQ-01`, `ECN-01`, `BOM-01`, `KIT-01`, `UI-01`) |
| **Module** | Functional module within the Harness Engineering Tracker |
| **Platform** | Target execution platform (e.g. `Web App Desktop / Tablet`) |
| **Role / login** | Persona testing the workflow (e.g. `Design Engineer`, `Costing Engineer`, `PPC Lead`, `System Admin`) |
| **Priority** | Priority level (`P1` = Core Poka-Yoke / Critical Gate; `P2` = Secondary Workflow / UI Feature) |
| **Scenario** | High-level summary of what is being tested |
| **Preconditions** | Starting system state and database requirements |
| **Steps** | Numbered instructions to execute the test |
| **Expected result** | Verifiable success criteria, exact error messages, and Poka-Yoke enforcement |
| **Assigned tester** | Assigned quality assurance engineer (`Tester 1`) |
| **Status** | Execution status (`Not Started` / `Pass` / `Fail`) |
| **Tested on** | Execution date timestamp |
| **Device / browser** | Environment details (`Windows 11 / Chrome / Edge`) |
| **Notes** | Architecture logic, Poka-Yoke gate rule, and business compliance notes |
| **Bug / evidence link** | Reference ticket, video, or screenshot artifact |

---

## Summary of Test Modules & Scenarios

### 1. Master Data & Hierarchy (MD)
| ID | Priority | Role | Scenario | Poka-Yoke Rule |
| :--- | :---: | :--- | :--- | :--- |
| **MD-01** | **P1** | System Admin | Customer creation, case-insensitive duplicate rejection, and historical deactivation | Unique case-insensitive customer names. Inactivation preserves historical audit trail without deleting linked data. |
| **MD-02** | **P1** | Design Engineer | Identical model names under different customers remain separate projects | Composite constraint `UNIQUE(customer_id, model_name)` scopes vehicle models per OEM customer. |
| **MD-03** | **P1** | Design Engineer | Global harness number company-wide uniqueness enforcement | Global unique constraint prevents duplicate wiring harness numbers across all customers and projects. |
| **MD-04** | **P2** | Engineering Lead | Engineer Master creation, active toggle, and assignment dropdown linkage | Engineers are maintained centrally and linked across RFQ and ECN forms. |

---

### 2. Revision Control & Single-Active Poka-Yoke (RC)
| ID | Priority | Role | Scenario | Poka-Yoke Rule |
| :--- | :---: | :--- | :--- | :--- |
| **RC-01** | **P1** | Design Engineer | Harness multi-revision recording and historical revision immutability | Multiple revisions per harness; past revisions retain their volume and circuit specs. |
| **RC-02** | **P1** | Design Engineer | Second Active revision creation strict blocking | **CRITICAL POKA-YOKE:** Only one revision can have status = 'Active' per harness. Prevents manufacturing lines from receiving conflicting drawings. |
| **RC-03** | **P1** | Design Engineer | Activating new revision succeeds after manual obsolescence | Requires setting active revision to 'Obsolete' before activating a successor revision. |

---

### 3. RFQ Tracker & Query Blocking Validation (RFQ)
| ID | Priority | Role | Scenario | Poka-Yoke Rule |
| :--- | :---: | :--- | :--- | :--- |
| **RFQ-01** | **P1** | Costing Engineer | Unresolved customer query strictly blocks Costing BOM submission date recording | **CRITICAL POKA-YOKE:** If `query_yes_no = true` and `query_status = 'Open'`, entering `costing_bom_submitted_date` is blocked. |
| **RFQ-02** | **P1** | Costing Engineer | Costing BOM submission permitted immediately upon query resolution | Resolving the query (`query_status = 'Resolved'`) clears the gate for quotation submission. |
| **RFQ-03** | **P1** | Design Engineer | RFQ sequential auto-numbering generation format `RFQ618260001` | Sequential increments with zero duplicates or collisions (`^RFQ61826\d{4}$`). |
| **RFQ-04** | **P1** | Design Engineer | Unconstrained free-text fields (Part No, Customer Rev, FG Code, FG Rev, Description) | Allows pure numbers, special characters, slashes, and spaces without arbitrary schema constraints. |
| **RFQ-05** | **P1** | Design Engineer | End Date strictly greater than Starting Date validation (Target Date & Actual Date) | **POKA-YOKE:** `target_date > work_start_date` and `completion_date > work_start_date`. Same day or past dates are rejected. |
| **RFQ-06** | **P1** | Design Engineer | Overall RFQ Status strict dependency on sub-milestone statuses (Query, Unique, Costing) | **POKA-YOKE:** Overall Status cannot be set to 'Close' if any milestone column remains 'Open'. |
| **RFQ-07** | **P1** | Design Engineer | Automatic Overall RFQ Status closure and reversion based on milestone transitions | When all sub-milestones reach 'Close', Overall Status automatically closes; reopening any sub-milestone reverts Overall Status to 'Open'. |
| **RFQ-08** | **P2** | Design Engineer | Circuit Count and Volume numeric sanitization | Automatically strips letters/units (e.g., "88 ckt" -> 88, "15,000 units" -> 15000). |
| **RFQ-09** | **P2** | Design Engineer | Query Type dropdown options validation (`proposal`, `query`, `query>proposal`) | Classifies technical inquiries according to DESPL customer communication standards. |
| **RFQ-10** | **P1** | Engineering Manager | Soft-deleting an RFQ preserves unique number, sets `is_deleted=1`, blocks restore and update | Soft-deleted records retain their number permanently. Sequence generator skips deleted numbers. Restore and updates are blocked. |
| **RFQ-11** | **P1** | Design Engineer | Automatic ECN creation triggered by RFQ `create_ecn` checkbox | Checking `create_ecn` instantly initializes an autofilled ECN under the ECN Tracker. |
| **RFQ-12** | **P2** | Design Engineer | Drawing Number, Model, Customer Name, and Review Note columns persistence | Full persistence and inline updating for all 25 RFQ Tracker columns. |

---

### 4. ECN Workflow & Assignment Locking Poka-Yoke (ECN)
| ID | Priority | Role | Scenario | Poka-Yoke Rule |
| :--- | :---: | :--- | :--- | :--- |
| **ECN-01** | **P1** | Design Engineer | Mandatory Change/Reason validation on ECN creation | **POKA-YOKE:** An ECN cannot be submitted without a clear, documented engineering change reason. |
| **ECN-02** | **P1** | Design Engineer | Costing Required demands mandatory linked RFQ | **POKA-YOKE:** If `costing_required = true`, linking an RFQ record is mandatory. |
| **ECN-03** | **P1** | Engineering Lead | Primary Engineer reassignment allowed before Work Start Date | Pre-work assignment corrections are allowed freely before labor begins. |
| **ECN-04** | **P1** | Engineering Lead | Primary Engineer reassignment strictly locked once Work Start Date is recorded | **CRITICAL POKA-YOKE:** Once work starts, primary engineer is immutable. Support Engineer may be added for assistance. |
| **ECN-05** | **P1** | Design Engineer | Mandatory Delay Reason when MIN Meeting Date exceeds Target Date | **POKA-YOKE:** If MIN Meeting occurs after Target Date, `delay_reason` is strictly mandatory. |
| **ECN-06** | **P2** | Design Engineer | ECN Tracker 23 columns persist, list in sequence, update inline, and soft-delete | Full persistence across sample, modification, pilot, and design VAVE stages. |

---

### 5. SAP BOM Sequencing & Label Upload Prerequisite (BOM)
| ID | Priority | Role | Scenario | Poka-Yoke Rule |
| :--- | :---: | :--- | :--- | :--- |
| **BOM-01** | **P1** | BOM / PPC Engineer | Sequential alternate validation per FG Code (`01` -> `02` -> `03`) | **POKA-YOKE:** BOM alternates must increment strictly sequentially. Jumping (e.g. from 01 to 03) is blocked. |
| **BOM-02** | **P1** | Quality / Packaging Lead | Label upload strictly blocked before official BOM release date is stamped | **CRITICAL POKA-YOKE:** Packaging labels cannot be uploaded or approved without an authorized, released BOM date. |
| **BOM-03** | **P1** | Quality / Packaging Lead | Label layout upload succeeds immediately upon BOM release signoff | Releasing the BOM clears the prerequisite gate for label upload. |

---

### 6. MIN Meeting & Consolidated Kit Prerequisite (KIT)
| ID | Priority | Role | Scenario | Poka-Yoke Rule |
| :--- | :---: | :--- | :--- | :--- |
| **KIT-01** | **P1** | PPC Lead / Store Manager | "No MIN, No Kit List entry" rule strictly enforced | **CRITICAL POKA-YOKE:** Kit List registration is strictly prohibited until a formal MIN meeting is signed off. |
| **KIT-02** | **P1** | PPC Lead / Store Manager | Recording MIN meeting concludes ECN and permits Consolidated Kit generation | Concludes ECN and auto-populates harness number, revision, volume, circuit count, rack, and file numbers into the Kit List. |

---

### 7. UI, Themes & Project Kit List (UI)
| ID | Priority | Role | Scenario | Description |
| :--- | :---: | :--- | :--- | :--- |
| **UI-01** | **P2** | All Users | Dark Theme & Light Theme instant switching and localStorage persistence | Instant switching between DESPL Dark (#0B1120) and Light (#F8FAFC) modes without page reload. |
| **UI-02** | **P1** | Program Manager | Clean Project Kit List (Tab 6): Customer Portfolio vs. Single Customer View | Clean layout: Customer dropdown with flat 3-sheet switcher (RFQ Sheet, ECN Sheet, Kit List) without clutter. |
| **UI-03** | **P2** | Design Engineer | Zero Hardcoded Mock Data Guarantee across all views and tables | All tables show clean empty states when no records exist; zero dummy names or fake seed rows in code or database. |
| **UI-04** | **P2** | Quality Lead | Excel export functionality for RFQ Sheet, ECN Sheet, and Kit List | Exports clean customer-filtered `.xlsx` / `.csv` spreadsheets with all DESPL columns preserved. |
