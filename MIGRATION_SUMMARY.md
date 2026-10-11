# 45 Engineering Tracker — Migration Specification & Architecture Documentation

## Overview

The **45 Engineering Tracker** has been fully migrated from Python (PySide6 desktop client) into a modern, responsive, high-performance web application built with **Next.js 15 (TypeScript, App Router)** and a local **SQLite database** using Node's native `node:sqlite` (`DatabaseSync`).

All 100% of the UI design, color palette, typography, branding (including the signature golden **DESPL** header), workflows, master data relationships, and strict **Poka-Yoke business validation rules** have been faithfully preserved.

---

## 1. Technology Stack Comparison

| Component | Legacy Python Architecture | Migrated Next.js Architecture |
|---|---|---|
| **Runtime / Language** | Python 3.14 | Node.js 24 / TypeScript 5.7 |
| **Frontend Framework** | PySide6 (Qt desktop client) | Next.js 15 (React 19 App Router) |
| **Styling** | QSS (Qt Style Sheets) | Vanilla CSS (CSS Variables, Flexbox, CSS Grid) |
| **Icons** | Custom unicode / Qt icons | Lucide React |
| **Database** | SQLite via SQLAlchemy 2.0 | SQLite via native `node:sqlite` (`DatabaseSync`) |
| **Exports** | openpyxl / pandas | xlsx (Excel `.xlsx` and CSV streaming) |
| **Testing** | pytest | Node native test runner (`node:test`, `node:assert`) via tsx |

---

## 2. Directory & File Structure

```
d:\HARNESS-TRACKER/
├── data/
│   └── engineering_tracker.db         # Authoritative SQLite database
├── src/
│   ├── app/
│   │   ├── api/                       # REST API Route Handlers
│   │   │   ├── boms/route.ts          # SAP BOM upload & release endpoints
│   │   │   ├── customers/route.ts     # Customer master CRUD
│   │   │   ├── dashboard/route.ts     # Project dashboard aggregations
│   │   │   ├── ecns/route.ts          # ECN lifecycle & delay validations
│   │   │   ├── engineers/route.ts     # Engineer master CRUD
│   │   │   ├── export/route.ts        # Excel (.xlsx) & CSV export endpoint
│   │   │   ├── harnesses/route.ts     # Globally unique harness numbers
│   │   │   ├── kits/route.ts          # Consolidated Active Kit endpoints
│   │   │   ├── labels/route.ts        # Label upload history endpoints
│   │   │   ├── min/route.ts           # MIN meeting recording endpoints
│   │   │   ├── projects/route.ts      # Customer + Model project contexts
│   │   │   ├── revisions/route.ts     # Revision lifecycle & active status
│   │   │   ├── rfqs/route.ts          # RFQ tracking & query blocking
│   │   │   └── workload/route.ts      # Engineer workload analytics
│   │   ├── globals.css                # Vanilla CSS design system (Navy dark mode)
│   │   ├── layout.tsx                 # Root layout & page metadata
│   │   ├── not-found.tsx              # Custom 404 page handler
│   │   └── page.tsx                   # Interactive desktop-grade single-page UI
│   └── lib/
│       ├── db.ts                      # SQLite connection, DDL schema, & auto-seed
│       └── services.ts                # Service layer with Poka-Yoke business rules
├── scripts/
│   └── test_poka_yoke.mjs             # 22 automated business rule tests
├── package.json                       # Dependencies & npm scripts
├── tsconfig.json                      # Strict TypeScript configuration
├── next.config.ts                     # Next.js build configuration
├── README.md                          # Project quick-start & overview
└── MIGRATION_SUMMARY.md               # This migration document
```

---

## 3. Database Schema (`data/engineering_tracker.db`)

All tables enforce foreign keys and database-level constraints:

1. **`customers`**: `id`, `name` (unique, nocase), `is_active`, audit timestamps.
2. **`engineers`**: `id`, `name` (unique, nocase), `is_active`, audit timestamps.
3. **`projects`**: `id`, `customer_id`, `model_name`, `UNIQUE(customer_id, model_name)`.
4. **`harnesses`**: `id`, `project_id`, `harness_number` (globally unique across the company).
5. **`revisions`**: `id`, `harness_id`, `revision_code`, `sop_number`, `volume`, `circuit_count`, `status` (`Active` / `Obsolete`), `UNIQUE(harness_id, revision_code)`.
6. **`rfqs`**: `id`, `rfq_number` (unique), `harness_id`, `revision_id`, marketing/design/target dates, costing submission date, query tracking (`yes/no`, `status`, `remark`), proposal tracking (`yes/no`, `status`, `remark`), overall status.
7. **`ecns`**: `id`, `ecn_number` (unique), `harness_id`, `source_revision_id`, `stage_context` (`Sample` / `Production`), `development_type` (`New Development` / `Productized`), `change_reason`, `revision_impact` (`Same Revision` / `New Revision`), `new_revision_id`, `costing_required`, `rfq_id`, `primary_engineer_id`, `support_engineer_id`, dates, `delay_reason`.
8. **`bom_records`**: `id`, `fg_code`, `bom_alternate`, `customer_part_number`, `customer_revision`, `fg_revision`, `ecn_id`, `uploaded_by_id`, `upload_date`, `release_date`, `UNIQUE(fg_code, bom_alternate)`.
9. **`label_uploads`**: `id`, `bom_id`, `fg_code`, `bom_alternate`, `uploaded_by_id`, `upload_date`, `reason`.
10. **`min_meetings`**: `id`, `ecn_id` (unique), `meeting_date`, `remarks`.
11. **`consolidated_kits`**: `id`, `ecn_id` (unique), `rack_number`, `file_number`, `hard_copy_location`, `status`.

---

## 4. Poka-Yoke Business Rules Enforced

The TypeScript service layer in `src/lib/services.ts` implements the complete business rule set:

### 4.1 Master Data & Hierarchy
- **Customer Deactivation**: Deactivating a customer preserves all foreign key historical references across existing projects, harnesses, and ECNs.
- **Project Identity**: Model name belongs to a customer. Identical model names under different customers (e.g. Customer A Model X vs Customer B Model X) remain distinct project entities.
- **Global Harness Number Uniqueness**: A harness number cannot be reused under any customer or project.

### 4.2 Revision Control
- **Single-Active Revision Constraint**: Exactly one revision per harness can be `Active` at a time.
- **Blocking Rule**: If an engineer tries to activate Revision `B` while Revision `A` is still active, the system blocks the operation with an explicit error:
  > *"Cannot activate Revision 'B' because Revision 'A' is still Active for this Harness. Manually mark Revision 'A' as Obsolete before activating Revision 'B'."*
- **Immutability of Revision History**: Revision-specific SOP numbers, volumes, and circuit counts remain immutable historical records.

### 4.3 RFQ Tracking
- **System-Generated Unique Numbering**: Sequential numbering format `RFQ-YYYY-XXXX`.
- **Query Blocking Rule**: If `Query = Yes` and `Query Status = Open`, the system strictly blocks entering or updating `Costing BOM Submitted Date`.

### 4.4 ECN Management
- **System-Generated Unique Numbering**: Sequential numbering format `ECN-YYYY-XXXX`.
- **Mandatory Change/Reason**: Free text cannot be empty or whitespace.
- **Costing Required Mandate**: If `Costing Required = Yes`, a linked RFQ is strictly required.
- **Primary Engineer Locking**: Once `Work Start Date` is recorded, reassigning the Primary Engineer is strictly blocked.
- **Calendar-Day Duration Calculations**:
  - $\text{Planned Duration} = \text{Target Date} - \text{Work Start Date}$
  - $\text{Actual Duration} = \text{MIN Date} - \text{Work Start Date}$
  - $\text{Delay Days} = \max(0, \text{MIN Date} - \text{Target Date})$
- **Mandatory Delay Reason**: If $\text{MIN Meeting Date} > \text{Target Date}$, a delay reason is mandatory.

### 4.5 SAP BOM & Label Uploads
- **FG Code + BOM Alternate Uniqueness**: The combination of `(fg_code, bom_alternate)` is unique.
- **Sequential Alternates**: Validates sequential numbering (`01` $\rightarrow$ `02` $\rightarrow$ `03`...). Jumping sequences or creating placeholder alternates without an upload is blocked.
- **Event-Driven BOM Status**: Automatically derived as `Pending Upload` $\rightarrow$ `Uploaded` $\rightarrow$ `Released`.
- **Label Upload Prerequisite**: Label uploads are strictly blocked before the target BOM has a recorded `Release Date`.

### 4.6 MIN & Consolidated Active Kit
- **1:1 MIN Rule**: An ECN can have at most one MIN meeting.
- **Automatic Completion Date**: The MIN meeting date automatically populates the ECN completion milestone.
- **"No MIN, No Kit List Entry"**: Consolidated Active Kit entries cannot be created before the MIN meeting is concluded.
- **Automatic Source Derivation**: Kit views automatically pull harness, customer, model, revision, SOP, volume, circuit count, and stage context from central records without manual re-entry.

---

## 5. UI Features & Pages

The application operates as a desktop-style dashboard with 8 primary views:

1. **Project Dashboard**: Model filter, real-time status metric cards, and harness master list with "+ New Revision" shortcuts.
2. **Engineer Workload**: Per-engineer cards displaying upcoming, overdue, and completed assignments.
3. **RFQ Tracker**: Full milestone table, query status tags, proposal status tags, update modal, and Excel export.
4. **ECN Tracker**: Engineering change records, stage badges, delay counters, update modal, and quick-action "+ MIN" button.
5. **BOM & Label Upload**: SAP upload form, one-click BOM release modal, and historical label upload audit log.
6. **Consolidated Active Kit List**: Read-only derived engineering fields with editable master physical archive rack & file locations.
7. **Project Kit List**: Comprehensive project-level aggregator across RFQs, ECNs, Revisions, BOMs, and Kit locations.
8. **Master Data**: Side-by-side management panels for Customers, Engineers, Projects, and Revisions with live Active/Obsolete toggles.

---

## 6. How to Run & Validate

### Development Server
```bash
npm run dev
```
Accessible at: `http://localhost:3002` (or `http://localhost:3000`).

### Production Build
```bash
npm run build
npm start
```

### Automated Poka-Yoke Test Suite
```bash
npm test
```
Executes all 22 tests verifying master data hierarchy, revision obsolescence, query blocking, costing linkage, engineer locking, delay reasons, BOM sequencing, label release prerequisites, and kit generation.
