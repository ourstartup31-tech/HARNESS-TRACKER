# 45 Engineering Tracker

A centralized engineering management desktop application for automotive wiring-harness engineering. Designed to replace five fragmented Excel trackers with a single normalized SQLite database, strict Poka-Yoke business validation, and a high-productivity PySide6 interface.

## Core Capabilities
- **Master Data**: Customer master, Engineer master, and Customer + Model project contexts.
- **Harness & Revision Management**: Globally unique harness numbers, immutable revision history, and single-active-revision constraint enforcement.
- **RFQ Tracking**: Milestone management, query tracking, proposal status, and Costing BOM submission validation.
- **ECN Tracking**: Two-dimensional classification (Stage/Context × Development Type), reason tracking, revision impacts, costing linkage, calendar-day duration calculations, delay reasons, and engineer assignment protection.
- **BOM Upload & Release**: Unique `FG Code + BOM Alternate` management, sequential alternate validation, and event-driven status tracking (`Pending Upload` → `Uploaded` → `Released`).
- **Label Upload History**: Preserves complete label revision history; strictly blocks label uploads before BOM release.
- **MIN & Kit Records**: 1:1 ECN to MIN completion linkage, and automated generation of Consolidated Active Kit List entries upon MIN conclusion.
- **Dashboards & Views**: Real-time Project Dashboard, Engineer Workload Dashboard, Project Kit List, and Harness Revision History.

## Running the Application
```bash
# Activate virtual environment
.venv\Scripts\activate

# Launch the PySide6 desktop UI
python -m app.engineering_tracker.main
```

## Running Automated Tests
```bash
python -m pytest tests/ -v
```
