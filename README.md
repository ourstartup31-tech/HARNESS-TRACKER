# 45 Engineering Tracker

A centralized engineering management desktop web application for automotive wiring-harness engineering. Designed to replace five fragmented Excel trackers with a single normalized SQLite database, strict Poka-Yoke business validation, and a high-productivity Next.js interface.

## Core Capabilities
- **Master Data**: Customer master, Engineer master, and Customer + Model project contexts.
- **Harness & Revision Management**: Globally unique harness numbers, immutable revision history, and single-active-revision constraint enforcement.
- **RFQ Tracking**: Milestone management, query tracking, proposal status, and Costing BOM submission validation.
- **ECN Tracking**: Two-dimensional classification (Stage/Context × Development Type), reason tracking, revision impacts, costing linkage, calendar-day duration calculations, delay reasons, and engineer assignment protection.
- **BOM Upload & Release**: Unique `FG Code + BOM Alternate` management, sequential alternate validation, and event-driven status tracking (`Pending Upload` → `Uploaded` → `Released`).
- **Label Upload History**: Preserves complete label revision history; strictly blocks label uploads before BOM release.
- **MIN & Kit Records**: 1:1 ECN to MIN completion linkage, and automated generation of Consolidated Active Kit List entries upon MIN conclusion.
- **Dashboards & Views**: Real-time Project Dashboard, Engineer Workload Dashboard, Project Kit List, and Master Data Registry.

## Running the Application
```bash
# Install dependencies
npm install

# Launch development server
npm run dev

# Build for production
npm run build
npm start
```
Accessible at: `http://localhost:3000` (or `http://localhost:3002`).

## Running Automated Poka-Yoke Tests
```bash
npm test
```

For complete technical and architectural details, see [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md).
