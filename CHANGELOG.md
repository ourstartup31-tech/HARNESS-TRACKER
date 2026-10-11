# Change Log — 45 Engineering Tracker

All notable changes to the 45 Engineering Tracker application will be documented in this file.

---

## [1.0.1] - 2026-10-11

### Added
- **DESPL Brand Heading on Dashboard**:
  - Added a centered golden heading reading **"DESPL"** at the top of the **Project Dashboard** tab (`ProjectDashboardPage`).
  - Styled with font **Calibri** (`font-family: 'Calibri', sans-serif;`, bold, 38px, letter-spacing 6px).
  - Applied metallic golden color `#d4af37`.
- **Automated UI Test Assertion**:
  - Updated `tests/test_ui.py` to assert that `despl_heading` exists on the dashboard page, displays text `"DESPL"`, uses Calibri font, and applies the `#d4af37` golden color.

### Modified Files
- `app/engineering_tracker/ui/pages/project_dashboard_page.py`
- `tests/test_ui.py`

---

## [1.0.0] - 2026-10-11

### Initial Build & Release
- **Core Architecture & Data Hierarchy**:
  - Implemented normalized SQLite database with foreign key enforcement (`PRAGMA foreign_keys = ON;`).
  - Entity hierarchy: Customer → Project (Customer + Model) → Harness (globally unique) → Revision (immutable history) → ECN.
- **Master Data**:
  - Customer Master (`CustomerService`) with active/inactive status and project links.
  - Engineer Master (`EngineerService`) with active allocation control.
  - Model/Project Service (`ProjectService`) ensuring Customer + Model uniqueness.
- **Harness & Revision Control**:
  - Globally unique harness numbers across the company (`HarnessService`).
  - Revision management with immutable SOP Number, Volume, and Circuits (`RevisionService`).
  - Strict Poka-Yoke **single-active-revision** enforcement: blocking activation of a new revision until the older active revision is manually marked Obsolete.
- **RFQ Tracking Module**:
  - Milestone tracking with sequential system-generated `RFQ-YYYY-XXXX` numbering (`RFQService`).
  - Query management: unresolved queries strictly block Costing BOM submission.
  - Independent proposal tracking.
- **ECN Change Management Module**:
  - Two-dimensional classification: Stage/Context (*Sample* / *Production*) × Development Type (*New Development* / *Productized*) (`ECNService`).
  - Mandatory change/reason free text.
  - New Revision enforcement when `Revision Impact == 'New Revision'`.
  - Mandatory linked RFQ when `Costing Required == True`.
  - Primary Engineer reassignment locking after `work_start_date` is recorded.
  - Calendar-day duration calculations (Planned Duration, Actual Duration, Delay Days).
  - Mandatory delay reason when MIN meeting date > Target date.
- **BOM Upload & Release Module**:
  - SAP BOM upload management keyed by `FG Code + BOM Alternate` (`BOMService`).
  - Strict sequential alternate validation per FG Code (`01`, `02`, `03`...).
  - Event-driven derived status: *Pending Upload* → *Uploaded* → *Released*.
- **Label Upload Module**:
  - Multiple historical label uploads per BOM with date, uploader, and reason (`LabelService`).
  - Poka-Yoke check: label uploads strictly blocked before BOM is released.
- **MIN & Consolidated Active Kit List**:
  - Strict 1:1 ECN to MIN meeting completion milestone (`MINService`).
  - Consolidated Active Kit List generation strictly gated by MIN completion (*"No MIN, no Kit List entry!"*) (`KitService`).
  - Maintains physical hard master storage locations (`rack_number`, `file_number`, `hard_copy_location`).
- **Generated Views & Dashboards**:
  - Real-time Project Dashboard with 8 KPI stat cards and harness drill-down.
  - Engineer Workload Dashboard with open, upcoming, overdue tasks and duration metrics.
  - RFQ Tracker table with single-click Excel export.
  - ECN Tracker table with MIN recording and BOM upload shortcuts.
  - BOM & Label Upload tracker table with BOM release and label history viewer.
  - Individual Project Kit List aggregating complete engineering lifecycle by Customer + Model.
- **Excel Export Utility**:
  - Implemented Excel `.xlsx` workbook exporter using `openpyxl` and `pandas` (`app/engineering_tracker/utils/export.py`).
- **Desktop UI**:
  - Built desktop application with PySide6 (`MainWindow`), dark engineering theme stylesheet (`styles.py`), reusable stat cards (`StatCard`), searchable data tables (`DataTableWidget`), and dedicated modal dialogs for all workflows.
- **Automated Test Suite**:
  - 36 automated unit, integration, and headless UI tests passing with 100% success rate (`pytest`).
