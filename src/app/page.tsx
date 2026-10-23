"use client";

import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  HardHat,
  FileSpreadsheet,
  RefreshCw,
  PackageCheck,
  FolderKanban,
  Files,
  Settings,
  Plus,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Database,
  Calendar,
  Trash2
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Core Data Stores
  const [customers, setCustomers] = useState<any[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [harnesses, setHarnesses] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [ecns, setEcns] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [labels, setLabels] = useState<any[]>([]);
  const [kits, setKits] = useState<any[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<any>(null);
  const [workloads, setWorkloads] = useState<any[]>([]);
  const [projectKitRows, setProjectKitRows] = useState<any[]>([]);

  // Filter selections
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>("");

  // Modal Dialog states
  const [modalType, setModalType] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>({});
  const [modalError, setModalError] = useState<string | null>(null);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ id: number; targetNum: string; type: "rfq" | "ecn" } | null>(null);

  // Auto-dismiss alerts
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => setSuccessBanner(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  // Load all data
  const refreshAll = async () => {
    try {
      setLoading(true);
      setErrorBanner(null);

      const [
        custRes, engRes, projRes, harnRes, revRes,
        rfqRes, ecnRes, bomRes, labelRes, kitRes, dashRes, workRes
      ] = await Promise.all([
        fetch("/api/customers").then(r => r.json()),
        fetch("/api/engineers").then(r => r.json()),
        fetch("/api/projects").then(r => r.json()),
        fetch("/api/harnesses").then(r => r.json()),
        fetch("/api/revisions").then(r => r.json()),
        fetch("/api/rfqs").then(r => r.json()),
        fetch("/api/ecns").then(r => r.json()),
        fetch("/api/boms").then(r => r.json()),
        fetch("/api/labels").then(r => r.json()),
        fetch("/api/kits").then(r => r.json()),
        fetch(`/api/dashboard${selectedProjectId ? `?project_id=${selectedProjectId}` : ""}`).then(r => r.json()),
        fetch(`/api/workload${selectedEngineerId ? `?engineer_id=${selectedEngineerId}` : ""}`).then(r => r.json())
      ]);

      if (custRes.data) setCustomers(custRes.data);
      if (engRes.data) setEngineers(engRes.data);
      if (projRes.data) setProjects(projRes.data);
      if (harnRes.data) setHarnesses(harnRes.data);
      if (revRes.data) setRevisions(revRes.data);
      if (rfqRes.data) setRfqs(rfqRes.data);
      if (ecnRes.data) setEcns(ecnRes.data);
      if (bomRes.data) setBoms(bomRes.data);
      if (labelRes.data) setLabels(labelRes.data);
      if (kitRes.data) setKits(kitRes.data);
      if (dashRes.data) setDashboardMetrics(dashRes.data);
      if (workRes.data) setWorkloads(workRes.data);

      if (selectedProjectId) {
        const pkRes = await fetch(`/api/dashboard?mode=project_kit&project_id=${selectedProjectId}`).then(r => r.json());
        if (pkRes.data) setProjectKitRows(pkRes.data);
      }
    } catch (err: any) {
      setErrorBanner("Failed to connect to database: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [selectedProjectId, selectedEngineerId]);

  // Ensure clicking anywhere on any date input box triggers the calendar picker
  useEffect(() => {
    const handleGlobalDateClick = (e: MouseEvent) => {
      const el = e.target as HTMLInputElement;
      if (el && el.tagName === "INPUT" && el.type === "date") {
        try {
          (el as any).showPicker?.();
        } catch { }
      }
    };
    document.addEventListener("click", handleGlobalDateClick);
    return () => document.removeEventListener("click", handleGlobalDateClick);
  }, []);

  // Export handler
  const handleExport = (type: string, format: "xlsx" | "csv" = "xlsx") => {
    let url = `/api/export?type=${type}&format=${format}`;
    if (type === "project_kit") {
      if (!selectedProjectId) {
        alert("Please select a project to export its kit list.");
        return;
      }
      url += `&project_id=${selectedProjectId}`;
    }
    window.open(url, "_blank");
  };

  // RFQ Status Dropdown Options
  const RFQ_STATUS_OPTIONS = [
    "Open",
    "Close",
    "need to review",
    "Pending>close",
    "Hold>close"
  ];

  // RFQ Overall Status Dropdown Options (without 'need to review')
  const OVERALL_STATUS_OPTIONS = [
    "Open",
    "Close",
    "Pending>close",
    "Hold>close"
  ];

  // RFQ Costing BOM Status Dropdown Options (without 'need to review')
  const COSTING_BOM_STATUS_OPTIONS = [
    "Open",
    "Close",
    "Pending>close",
    "Hold>close"
  ];

  // RFQ Query Type Dropdown Options
  const QUERY_TYPE_OPTIONS = [
    "proposal",
    "query",
    "query>proposal"
  ];

  // ECN Stage Dropdown Options (Exact sequence from user requirements)
  const ECN_STAGE_OPTIONS = [
    "sample",
    "new dev",
    "modification",
    "design vave",
    "design error",
    "prd feedback"
  ];

  // ECN MIN Status Dropdown Options
  const ECN_MIN_STATUS_OPTIONS = [
    "Open",
    "Close",
    "Pending",
    "Hold"
  ];

  // ECN Overall Status Dropdown Options
  const ECN_OVERALL_STATUS_OPTIONS = [
    "Open",
    "Close",
    "In Progress",
    "Pending>close",
    "Hold>close"
  ];

  // Inline update helper for fast table editing
  const handleInlineUpdate = async (id: number, patchData: any) => {
    try {
      const res = await fetch("/api/rfqs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patchData })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Update failed");
      }
      setSuccessBanner("Updated successfully!");
      refreshAll();
    } catch (err: any) {
      setErrorBanner("Failed to save: " + err.message);
    }
  };

  // Inline update helper for fast ECN table editing
  const handleInlineEcnUpdate = async (id: number, patchData: any) => {
    try {
      const res = await fetch("/api/ecns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patchData })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Update failed");
      }
      setSuccessBanner("ECN updated successfully!");
      refreshAll();
    } catch (err: any) {
      setErrorBanner("Failed to save ECN: " + err.message);
    }
  };

  // Delete RFQ execution (triggered from custom popup confirmation)
  const executeDeleteRfq = async (id: number, rfqNum: string) => {
    try {
      const res = await fetch(`/api/rfqs?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to delete");
      setSuccessBanner(`RFQ ${rfqNum} deleted.`);
      refreshAll();
    } catch (err: any) {
      setErrorBanner("Failed to delete RFQ: " + err.message);
    }
  };

  // Delete ECN execution (triggered from custom popup confirmation)
  const executeDeleteEcn = async (id: number, ecnNum: string) => {
    try {
      const res = await fetch(`/api/ecns?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to delete");
      setSuccessBanner(`ECN ${ecnNum} deleted.`);
      refreshAll();
    } catch (err: any) {
      setErrorBanner("Failed to delete ECN: " + err.message);
    }
  };

  // Open New RFQ with next generated number and empty fields
  const handleOpenNewRfq = async () => {
    let nextNum = "RFQ618260001";
    try {
      const res = await fetch("/api/rfqs?action=next_number");
      const json = await res.json();
      if (json.next_rfq_number) {
        nextNum = json.next_rfq_number;
      }
    } catch (err) {
      console.error("Failed to fetch next RFQ number:", err);
    }
    setModalData({
      rfq_number: nextNum,
      customer_name: "",
      create_ecn: false,
      sr_no: nextNum,
      unique_rfq_no: nextNum,
      drawing_number: "",
      model: "",
      engineer_id: "",
      engineer_name: "",
      harness_part_no: "",
      customer_revision: "",
      fg_code: "",
      fg_rev: "",
      description: "",
      no_of_ckt: "",
      volume: "",
      query_yes_no: false,
      query_status: "Open",
      unique_status: "Open",
      costing_bom_status: "Open",
      remark: "",
      review_note: "",
      overall_rfq_status: "Open",
      marketing_input_date: new Date().toISOString().split("T")[0]
    });
    setModalError(null);
    setModalType("new_rfq");
  };

  // Open New ECN with default fields
  const handleOpenNewEcn = () => {
    setModalData({
      rfq_no: "",
      stage: "sample",
      customer_name: "",
      model_name: "",
      query_status: "Open",
      unique_list_share_date: "",
      unique_rfq_no: "",
      unique_status: "Open",
      sap_bom_upload_date: "",
      sap_bom_released_date: "",
      prd_bom_release_date: "",
      label_upload_date: "",
      min_by_engineer_date: "",
      min_by_ppc: "",
      min_status: "Open",
      review: "",
      overall_status: "Open",
      no_of_ckt: "",
      volume: "",
      work_start_date: "",
      target_date: "",
      completion_date: ""
    });
    setModalError(null);
    setModalType("new_ecn");
  };

  // Submit modal form
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    let endpoint = "";
    let method = "POST";
    let payload = { ...modalData };

    switch (modalType) {
      case "new_customer":
        endpoint = "/api/customers";
        break;
      case "new_engineer":
        endpoint = "/api/engineers";
        break;
      case "new_project":
        endpoint = "/api/projects";
        break;
      case "new_harness":
        endpoint = "/api/harnesses";
        break;
      case "new_revision":
        endpoint = "/api/revisions";
        break;
      case "new_rfq":
        endpoint = "/api/rfqs";
        break;
      case "edit_rfq":
        endpoint = "/api/rfqs";
        method = "PATCH";
        break;
      case "new_ecn":
        endpoint = "/api/ecns";
        break;
      case "edit_ecn":
        endpoint = "/api/ecns";
        method = "PATCH";
        break;
      case "upload_bom":
        endpoint = "/api/boms";
        break;
      case "release_bom":
        endpoint = "/api/boms";
        method = "PATCH";
        break;
      case "upload_label":
        endpoint = "/api/labels";
        break;
      case "record_min":
        endpoint = "/api/min";
        break;
      case "kit_details":
        endpoint = "/api/kits";
        break;
      default:
        return;
    }

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Action failed.");
      }
      setSuccessBanner("Record saved successfully!");
      setModalType(null);
      setModalData({});
      refreshAll();
    } catch (err: any) {
      setModalError(err.message);
    }
  };

  // Status toggle handler
  const toggleRevisionStatus = async (revId: number, currentStatus: string) => {
    const newStatus = currentStatus === "Active" ? "Obsolete" : "Active";
    try {
      const res = await fetch("/api/revisions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: revId, status: newStatus })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update revision status.");
      }
      setSuccessBanner(`Revision status changed to ${newStatus}.`);
      refreshAll();
    } catch (err: any) {
      setErrorBanner(err.message);
    }
  };

  const navItems = [
    { label: "Project Dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Engineer Workload", icon: <HardHat size={18} /> },
    { label: "RFQ Tracker", icon: <FileSpreadsheet size={18} /> },
    { label: "ECN Tracker", icon: <RefreshCw size={18} /> },
    { label: "BOM & Label Upload", icon: <PackageCheck size={18} /> },
    { label: "Consolidated Active Kit", icon: <FolderKanban size={18} /> },
    { label: "Project Kit List", icon: <Files size={18} /> },
    { label: "Master Data", icon: <Settings size={18} /> },
  ];

  return (
    <div className="app-container">
      {/* 1. SIDEBAR */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-header">
            <div className="sidebar-title">
              <Database size={20} color="#38bdf8" />
              45 ENGINEERING TRACKER
            </div>
            <div className="sidebar-subtitle">Centralized Automotive System</div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map((item, idx) => (
              <button
                key={idx}
                className={`nav-item ${activeTab === idx ? "active" : ""}`}
                onClick={() => { setActiveTab(idx); setErrorBanner(null); }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="footer-user">
            👤 User: <b>Engineer</b>
          </div>
          <div className="footer-db">
            🟢 Database: SQLite Active
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="main-content">
        {/* DESPL Golden Heading */}
        <div className="brand-heading">DESPL</div>

        {/* Global Error & Success Banners */}
        {errorBanner && (
          <div className="error-banner" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={18} />
            <span style={{ flex: 1 }}>{errorBanner}</span>
            <button className="btn btn-outline" style={{ padding: "2px 6px" }} onClick={() => setErrorBanner(null)}>Dismiss</button>
          </div>
        )}
        {successBanner && (
          <div className="success-banner" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckCircle2 size={18} />
            <span>{successBanner}</span>
          </div>
        )}

        {/* TAB 0: PROJECT DASHBOARD */}
        {activeTab === 0 && (
          <div>
            <div className="page-header-bar">
              <div>
                <h1 className="page-title">Model / Project Dashboard</h1>
                <p className="page-subtitle">High-level status summary and drill-down across automotive harnesses</p>
              </div>
              <div className="header-actions">
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  style={{ minWidth: "220px" }}
                >
                  <option value="">All Projects (Global)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.customer_name} — {p.model_name}</option>
                  ))}
                </select>
                <button className="btn" onClick={() => { setModalType("new_harness"); setModalData({}); }}>
                  <Plus size={16} /> New Harness
                </button>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-card-title">Total Harnesses</span>
                <span className="stat-card-value">{dashboardMetrics?.total_harnesses || 0}</span>
                <span className="stat-card-desc">Active in model</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-title">Active Revisions</span>
                <span className="stat-card-value" style={{ color: "#34d399" }}>{dashboardMetrics?.active_revisions || 0}</span>
                <span className="stat-card-desc">1 active / harness</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-title">Open RFQs</span>
                <span className="stat-card-value" style={{ color: "#38bdf8" }}>{dashboardMetrics?.open_rfqs || 0}</span>
                <span className="stat-card-desc">Under costing</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-title">Open ECNs</span>
                <span className="stat-card-value" style={{ color: "#fbbf24" }}>{dashboardMetrics?.open_ecns || 0}</span>
                <span className="stat-card-desc">In engineering</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-title">Pending BOM</span>
                <span className="stat-card-value">{dashboardMetrics?.pending_bom_releases || 0}</span>
                <span className="stat-card-desc">Awaiting release</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-title">Pending Labels</span>
                <span className="stat-card-value">{dashboardMetrics?.pending_labels || 0}</span>
                <span className="stat-card-desc">Post BOM release</span>
              </div>
              <div className="stat-card">
                <span className="stat-card-title">MIN Concluded</span>
                <span className="stat-card-value" style={{ color: "#34d399" }}>{dashboardMetrics?.min_completed || 0}</span>
                <span className="stat-card-desc">Eligible for Kit</span>
              </div>
            </div>

            {/* Harness Drill-down Table */}
            <div className="card-panel">
              <div className="card-panel-header">
                <div className="card-panel-title">Harness Engineering Master Registry</div>
                <button className="btn btn-outline" onClick={() => handleExport("project_kit")}>
                  <Download size={15} /> Export View
                </button>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Harness Number</th>
                      <th>Customer</th>
                      <th>Model / Project</th>
                      <th>Active Revision</th>
                      <th>ECN Count</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardMetrics?.harnesses?.length ? (
                      dashboardMetrics.harnesses.map((h: any) => (
                        <tr key={h.id}>
                          <td style={{ fontWeight: 600, color: "#38bdf8" }}>{h.harness_number}</td>
                          <td>{h.customer_name}</td>
                          <td>{h.model_name}</td>
                          <td>
                            {h.active_revision ? (
                              <span className="badge badge-active">{h.active_revision}</span>
                            ) : (
                              <span className="badge badge-obsolete">None</span>
                            )}
                          </td>
                          <td>{h.ecn_count}</td>
                          <td>
                            <button
                              className="btn btn-outline"
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                              onClick={() => {
                                setModalType("new_revision");
                                setModalData({ harness_id: h.id });
                              }}
                            >
                              + New Rev
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={6} style={{ textAlign: "center", color: "#64748b" }}>No harnesses found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: ENGINEER WORKLOAD */}
        {activeTab === 1 && (
          <div>
            <div className="page-header-bar">
              <div>
                <h1 className="page-title">Engineer Workload & Allocation</h1>
                <p className="page-subtitle">Real-time assignment visibility, upcoming deadlines, and delay analytics</p>
              </div>
              <div className="header-actions">
                <select
                  value={selectedEngineerId}
                  onChange={e => setSelectedEngineerId(e.target.value)}
                  style={{ minWidth: "200px" }}
                >
                  <option value="">All Engineers</option>
                  {engineers.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
              {workloads.map(w => (
                <div key={w.engineer_id} className="card-panel">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: "#f8fafc" }}>{w.engineer_name}</div>
                    <span className="badge badge-in-progress">{w.open_ecns_count} Open ECNs</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                    <div style={{ background: "#0b1120", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Upcoming</div>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: "#38bdf8" }}>{w.upcoming_ecns_count}</div>
                    </div>
                    <div style={{ background: "#0b1120", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Overdue</div>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: w.overdue_ecns_count > 0 ? "#f87171" : "#34d399" }}>
                        {w.overdue_ecns_count}
                      </div>
                    </div>
                    <div style={{ background: "#0b1120", padding: "10px", borderRadius: "6px", textAlign: "center" }}>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>Completed</div>
                      <div style={{ fontSize: "18px", fontWeight: 700, color: "#34d399" }}>{w.completed_ecns_count}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: "12px", fontWeight: 600, color: "#94a3b8", marginBottom: "8px" }}>Assigned Active ECN Tasks:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {w.open_ecns?.length ? (
                      w.open_ecns.map((e: any) => (
                        <div key={e.id} style={{ background: "#0b1120", padding: "8px 10px", borderRadius: "6px", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                          <div>
                            <b style={{ color: "#38bdf8" }}>{e.ecn_number}</b> — {e.harness_number}
                            <div style={{ color: "#64748b", fontSize: "11px" }}>{e.model_name} ({e.customer_name})</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ color: e.target_date < new Date().toISOString().split("T")[0] ? "#f87171" : "#cbd5e1" }}>
                              Target: {e.target_date}
                            </div>
                            <span className="badge badge-open">{e.ecn_status}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: "#64748b", fontSize: "12px" }}>No active open assignments.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: RFQ TRACKER */}
        {activeTab === 2 && (
          <div>
            <div className="page-header-bar">
              <div>
                <h1 className="page-title">RFQ Tracker</h1>
                <p className="page-subtitle">Costing milestone management, customer query tracking, and proposal sign-off</p>
              </div>
              <div className="header-actions">
                <button className="btn btn-outline" onClick={() => handleExport("rfq", "xlsx")}>
                  <Download size={15} /> Export Excel
                </button>
                <button className="btn" onClick={handleOpenNewRfq}>
                  <Plus size={16} /> New RFQ
                </button>
              </div>
            </div>

            <div className="card-panel">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th className="sticky-col">Sr .No (unique RFQ No.)</th>
                      <th>Customer Name</th>
                      <th>Model</th>
                      <th>Drawing Number</th>
                      <th>harness part no.</th>
                      <th>customer revision</th>
                      <th>fg code</th>
                      <th>fg rev.</th>
                      <th>description</th>
                      <th>marketing in put received date</th>
                      <th>design in put received date</th>
                      <th>Query sent date</th>
                      <th>Query resolve date</th>
                      <th>Query type</th>
                      <th>Query status</th>
                      <th>Unique list share date</th>
                      <th>Unique RFQ No.</th>
                      <th>Unique status</th>
                      <th>costing BOM prepare date</th>
                      <th>Costing BOM shared date</th>
                      <th>Costing BOM Status</th>
                      <th>Remark</th>
                      <th>Over all status</th>
                      <th>Name</th>
                      <th>No. of ckt</th>
                      <th>Volume</th>
                      <th>Start date</th>
                      <th>Target Date</th>
                      <th>Actual Date</th>
                      <th>Review Note</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfqs.map((r, idx) => (
                      <tr key={r.id} className={r.is_deleted ? "table-row-deleted" : ""}>
                        <td className="sticky-col" style={{ fontWeight: 600, color: r.is_deleted ? "#fca5a5" : "#38bdf8", whiteSpace: "nowrap" }}>
                          {r.sr_no || r.rfq_number || idx + 1}
                          {r.is_deleted ? <span className="deleted-badge">DELETED</span> : null}
                        </td>
                        <td style={{ minWidth: "160px", padding: "4px" }}>
                          <select
                            className="table-inline-select"
                            value={r.customer_name || ""}
                            key={`cust-${r.id}-${r.customer_name || ""}`}
                            onChange={async (e) => {
                              const val = e.target.value;
                              if (val !== (r.customer_name || "")) {
                                await handleInlineUpdate(r.id, { customer_name: val });
                              }
                            }}
                          >
                            <option value="">Select Customer...</option>
                            {customers.map((c) => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                            {r.customer_name && !customers.some((c) => c.name === r.customer_name) && (
                              <option value={r.customer_name}>{r.customer_name}</option>
                            )}
                          </select>
                        </td>
                        <td style={{ minWidth: "150px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="Add Model..."
                            defaultValue={r.model || r.model_name || ""}
                            key={`mdl-${r.id}-${r.model || r.model_name || ""}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val !== (r.model || r.model_name || "")) {
                                await handleInlineUpdate(r.id, { model: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "150px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="Add Drawing No..."
                            defaultValue={r.drawing_number || ""}
                            key={`dwg-${r.id}-${r.drawing_number || ""}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val !== (r.drawing_number || "")) {
                                await handleInlineUpdate(r.id, { drawing_number: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "160px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="Harness Part No..."
                            defaultValue={r.harness_part_no || r.harness_number || ""}
                            key={`hpn-${r.id}-${r.harness_part_no || r.harness_number || ""}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val !== (r.harness_part_no || r.harness_number || "")) {
                                await handleInlineUpdate(r.id, { harness_part_no: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "110px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="Cust Rev..."
                            defaultValue={r.customer_revision || r.revision_code || ""}
                            key={`crev-${r.id}-${r.customer_revision || r.revision_code || ""}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val !== (r.customer_revision || r.revision_code || "")) {
                                await handleInlineUpdate(r.id, { customer_revision: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "130px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="FG Code..."
                            defaultValue={r.fg_code || ""}
                            key={`fgc-${r.id}-${r.fg_code || ""}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val !== (r.fg_code || "")) {
                                await handleInlineUpdate(r.id, { fg_code: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "100px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="FG Rev..."
                            defaultValue={r.fg_rev || ""}
                            key={`fgr-${r.id}-${r.fg_rev || ""}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val !== (r.fg_rev || "")) {
                                await handleInlineUpdate(r.id, { fg_rev: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "220px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="Add/update description..."
                            defaultValue={r.description || ""}
                            key={`${r.id}-${r.description || ""}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            onBlur={async (e) => {
                              const newDesc = e.target.value.trim();
                              if (newDesc !== (r.description || "")) {
                                await handleInlineUpdate(r.id, { description: newDesc });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "135px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-date-input"
                            value={r.marketing_input_date || ""}
                            onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={(e) => handleInlineUpdate(r.id, { marketing_input_date: e.target.value })}
                          />
                        </td>
                        <td style={{ minWidth: "135px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-date-input"
                            value={r.design_input_date || ""}
                            onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={(e) => handleInlineUpdate(r.id, { design_input_date: e.target.value })}
                          />
                        </td>
                        <td style={{ minWidth: "135px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-date-input"
                            value={r.query_submitted_date || r.query_sent_date || ""}
                            onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={(e) => handleInlineUpdate(r.id, { query_submitted_date: e.target.value })}
                          />
                        </td>
                        <td style={{ minWidth: "135px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-date-input"
                            value={r.reply_received_date || r.query_resolve_date || ""}
                            onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={(e) => handleInlineUpdate(r.id, { reply_received_date: e.target.value })}
                          />
                        </td>
                        <td style={{ minWidth: "150px", padding: "4px" }}>
                          <select
                            className="table-status-select"
                            value={r.query_type || ""}
                            onChange={(e) => handleInlineUpdate(r.id, { query_type: e.target.value })}
                          >
                            <option value="">-</option>
                            {QUERY_TYPE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            className="table-status-select"
                            value={r.query_status || "Open"}
                            onChange={(e) => {
                              const val = e.target.value;
                              const isAll = (val.toLowerCase() === "close" || val.toLowerCase() === "closed") &&
                                (r.unique_status?.toLowerCase() === "close" || r.unique_status?.toLowerCase() === "closed") &&
                                (r.costing_bom_status?.toLowerCase() === "close" || r.costing_bom_status?.toLowerCase() === "closed");
                              handleInlineUpdate(r.id, {
                                query_status: val,
                                query_yes_no: val !== "Close",
                                overall_rfq_status: isAll ? "Close" : (r.overall_rfq_status === "Close" ? "Open" : (r.overall_rfq_status || "Open"))
                              });
                            }}
                          >
                            {RFQ_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ minWidth: "135px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-date-input"
                            value={r.unique_list_share_date || ""}
                            onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={(e) => handleInlineUpdate(r.id, { unique_list_share_date: e.target.value })}
                          />
                        </td>
                        <td style={{ minWidth: "150px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="Unique RFQ No..."
                            defaultValue={r.unique_rfq_no || r.rfq_number || ""}
                            key={`unq-${r.id}-${r.unique_rfq_no || r.rfq_number || ""}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                            }}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val !== (r.unique_rfq_no || r.rfq_number || "")) {
                                await handleInlineUpdate(r.id, { unique_rfq_no: val });
                              }
                            }}
                          />
                        </td>
                        <td>
                          <select
                            className="table-status-select"
                            value={r.unique_status || "Open"}
                            onChange={(e) => {
                              const val = e.target.value;
                              const isAll = (r.query_status?.toLowerCase() === "close" || r.query_status?.toLowerCase() === "closed") &&
                                (val.toLowerCase() === "close" || val.toLowerCase() === "closed") &&
                                (r.costing_bom_status?.toLowerCase() === "close" || r.costing_bom_status?.toLowerCase() === "closed");
                              handleInlineUpdate(r.id, {
                                unique_status: val,
                                overall_rfq_status: isAll ? "Close" : (r.overall_rfq_status === "Close" ? "Open" : (r.overall_rfq_status || "Open"))
                              });
                            }}
                          >
                            {RFQ_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ minWidth: "135px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-date-input"
                            value={r.costing_bom_prepare_date || ""}
                            onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={(e) => handleInlineUpdate(r.id, { costing_bom_prepare_date: e.target.value })}
                          />
                        </td>
                        <td style={{ minWidth: "135px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-date-input"
                            value={r.costing_bom_submitted_date || ""}
                            onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={(e) => handleInlineUpdate(r.id, { costing_bom_submitted_date: e.target.value })}
                          />
                        </td>
                        <td>
                          <select
                            className="table-status-select"
                            value={r.costing_bom_status || "Open"}
                            onChange={(e) => {
                              const val = e.target.value;
                              const isAll = (r.query_status?.toLowerCase() === "close" || r.query_status?.toLowerCase() === "closed") &&
                                (r.unique_status?.toLowerCase() === "close" || r.unique_status?.toLowerCase() === "closed") &&
                                (val.toLowerCase() === "close" || val.toLowerCase() === "closed");
                              handleInlineUpdate(r.id, {
                                costing_bom_status: val,
                                overall_rfq_status: isAll ? "Close" : (r.overall_rfq_status === "Close" ? "Open" : (r.overall_rfq_status || "Open"))
                              });
                            }}
                          >
                            {COSTING_BOM_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ minWidth: "180px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="Add remark..."
                            defaultValue={r.remark || r.query_remark || ""}
                            key={`rem-${r.id}-${r.remark || ""}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val !== (r.remark || "")) {
                                await handleInlineUpdate(r.id, { remark: val, query_remark: val });
                              }
                            }}
                          />
                        </td>
                        <td>
                          <select
                            className="table-status-select"
                            value={
                              ((r.query_status?.toLowerCase() === "close" || r.query_status?.toLowerCase() === "closed") &&
                               (r.unique_status?.toLowerCase() === "close" || r.unique_status?.toLowerCase() === "closed") &&
                               (r.costing_bom_status?.toLowerCase() === "close" || r.costing_bom_status?.toLowerCase() === "closed"))
                                ? "Close"
                                : (r.overall_rfq_status === "Close" ? "Open" : (r.overall_rfq_status || "Open"))
                            }
                            onChange={(e) => handleInlineUpdate(r.id, { overall_rfq_status: e.target.value })}
                          >
                            {OVERALL_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ minWidth: "150px", padding: "4px" }}>
                          <select
                            className="table-status-select"
                            value={r.engineer_id || ""}
                            onChange={async (e) => {
                              const engId = e.target.value ? Number(e.target.value) : null;
                              const eng = engineers.find((item) => item.id === engId);
                              await handleInlineUpdate(r.id, {
                                engineer_id: engId,
                                engineer_name: eng ? eng.name : ""
                              });
                            }}
                          >
                            <option value="">Select Name...</option>
                            {engineers.filter(e => e.is_active || e.id === r.engineer_id).map((e) => (
                              <option key={e.id} value={e.id}>{e.name}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ minWidth: "90px", padding: "4px" }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="table-inline-input"
                            placeholder="Ckt..."
                            defaultValue={r.no_of_ckt !== undefined && r.no_of_ckt !== null && r.no_of_ckt !== "" ? r.no_of_ckt : (r.circuit_count ?? "")}
                            key={`ckt-${r.id}-${r.no_of_ckt ?? r.circuit_count ?? ""}`}
                            onKeyDown={(e) => {
                              if (!/[0-9]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
                                e.preventDefault();
                              }
                              if (e.key === "Enter") {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            onBlur={async (e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              const oldVal = String(r.no_of_ckt ?? r.circuit_count ?? "");
                              if (val !== oldVal) {
                                await handleInlineUpdate(r.id, { no_of_ckt: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "110px", padding: "4px" }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="table-inline-input"
                            placeholder="Volume..."
                            defaultValue={r.volume !== undefined && r.volume !== null && r.volume !== "" ? r.volume : ""}
                            key={`vol-${r.id}-${r.volume ?? ""}`}
                            onKeyDown={(e) => {
                              if (!/[0-9]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
                                e.preventDefault();
                              }
                              if (e.key === "Enter") {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            onBlur={async (e) => {
                              const val = e.target.value.replace(/[^0-9]/g, "");
                              const oldVal = String(r.volume ?? "");
                              if (val !== oldVal) {
                                await handleInlineUpdate(r.id, { volume: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "135px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-date-input"
                            value={r.work_start_date || r.start_date || ""}
                            onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={(e) => handleInlineUpdate(r.id, { work_start_date: e.target.value })}
                          />
                        </td>
                        <td style={{ minWidth: "135px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-date-input"
                            value={r.target_date || ""}
                            onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={(e) => handleInlineUpdate(r.id, { target_date: e.target.value })}
                          />
                        </td>
                        <td style={{ minWidth: "135px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-date-input"
                            value={r.completion_date || r.actual_date || ""}
                            onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={(e) => handleInlineUpdate(r.id, { completion_date: e.target.value })}
                          />
                        </td>
                        <td style={{ minWidth: "160px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="Add review note..."
                            defaultValue={r.review_note || ""}
                            key={`revnote-${r.id}-${r.review_note || ""}`}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if (val !== (r.review_note || "")) {
                                await handleInlineUpdate(r.id, { review_note: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {r.is_deleted ? (
                            <span className="badge badge-danger" style={{ padding: "4px 10px", fontSize: "11px", fontWeight: 700 }}>
                              Deleted
                            </span>
                          ) : (
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                className="btn btn-outline"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                onClick={() => {
                                  const isAll = (r.query_status?.toLowerCase() === "close" || r.query_status?.toLowerCase() === "closed") &&
                                    (r.unique_status?.toLowerCase() === "close" || r.unique_status?.toLowerCase() === "closed") &&
                                    (r.costing_bom_status?.toLowerCase() === "close" || r.costing_bom_status?.toLowerCase() === "closed");
                                  setModalType("edit_rfq");
                                  setModalData({
                                    ...r,
                                    overall_rfq_status: isAll ? "Close" : (r.overall_rfq_status === "Close" ? "Open" : (r.overall_rfq_status || "Open")),
                                    customer_name: r.customer_name || "",
                                    sr_no: r.sr_no || r.rfq_number || "",
                                    unique_rfq_no: r.unique_rfq_no || r.rfq_number || "",
                                    drawing_number: r.drawing_number || "",
                                    model: r.model || r.model_name || "",
                                    harness_part_no: r.harness_part_no || r.harness_number || "",
                                    customer_revision: r.customer_revision || r.revision_code || "",
                                    fg_code: r.fg_code || "",
                                    fg_rev: r.fg_rev || "",
                                    description: r.description || "",
                                    engineer_id: r.engineer_id || "",
                                    engineer_name: r.engineer_name || "",
                                    no_of_ckt: r.no_of_ckt !== undefined && r.no_of_ckt !== null ? String(r.no_of_ckt) : (r.circuit_count ? String(r.circuit_count) : ""),
                                    volume: r.volume !== undefined && r.volume !== null ? String(r.volume) : "",
                                    review_note: r.review_note || "",
                                  });
                                }}
                              >
                                Update
                              </button>
                              <button
                                className="btn btn-outline"
                                style={{ padding: "4px 8px", fontSize: "11px", color: "#f87171", borderColor: "rgba(239, 68, 68, 0.4)" }}
                                title="Delete RFQ"
                                onClick={() => setDeleteConfirmTarget({ id: r.id, targetNum: r.sr_no || r.rfq_number, type: "rfq" })}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ECN TRACKER */}
        {activeTab === 3 && (
          <div>
            <div className="page-header-bar">
              <div>
                <h1 className="page-title">ECN Tracker</h1>
                <p className="page-subtitle">Formal engineering change orders, Poka-Yoke costing links, and MIN completion</p>
              </div>
              <div className="header-actions">
                <button className="btn btn-outline" onClick={() => handleExport("ecn", "xlsx")}>
                  <Download size={15} /> Export Excel
                </button>
                <button className="btn" onClick={handleOpenNewEcn}>
                  <Plus size={16} /> New ECN
                </button>
              </div>
            </div>

            <div className="card-panel">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th className="sticky-col">ecn no.</th>
                      <th>rfq no.</th>
                      <th>stage</th>
                      <th>customer name</th>
                      <th>model name</th>
                      <th>Query status</th>
                      <th>Unique list share date</th>
                      <th>Unique RFQ No.</th>
                      <th>Unique status</th>
                      <th>sap bom upload date</th>
                      <th>sap bom released date</th>
                      <th>prd bom release date</th>
                      <th>label upload date</th>
                      <th>min by engineer date</th>
                      <th>min by ppc</th>
                      <th>min status</th>
                      <th>review</th>
                      <th>Over all status</th>
                      <th>No. of ckt</th>
                      <th>Volume</th>
                      <th>Start date</th>
                      <th>Target Date</th>
                      <th>Actual Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ecns.map((e, idx) => (
                      <tr key={e.id} className={e.is_deleted ? "table-row-deleted" : ""}>
                        <td className="sticky-col" style={{ fontWeight: 600, color: e.is_deleted ? "#fca5a5" : "#38bdf8", whiteSpace: "nowrap" }}>
                          {e.ecn_number || idx + 1}
                          {e.is_deleted ? <span className="deleted-badge">DELETED</span> : null}
                        </td>
                        <td style={{ minWidth: "150px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="RFQ No..."
                            defaultValue={e.rfq_no || ""}
                            key={`ecn-rfq-${e.id}-${e.rfq_no || ""}`}
                            onKeyDown={(ev) => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); }}
                            onBlur={async (ev) => {
                              const val = ev.target.value.trim();
                              if (val !== (e.rfq_no || "")) {
                                await handleInlineEcnUpdate(e.id, { rfq_no: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <select
                            className="table-inline-select"
                            value={e.stage || "sample"}
                            key={`ecn-stg-${e.id}-${e.stage || ""}`}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.stage || "")) {
                                await handleInlineEcnUpdate(e.id, { stage: val });
                              }
                            }}
                          >
                            {ECN_STAGE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ minWidth: "160px", padding: "4px" }}>
                          <select
                            className="table-inline-select"
                            value={e.customer_name || ""}
                            key={`ecn-cust-${e.id}-${e.customer_name || ""}`}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.customer_name || "")) {
                                await handleInlineEcnUpdate(e.id, { customer_name: val });
                              }
                            }}
                          >
                            <option value="">Select Customer...</option>
                            {customers.map((c) => (
                              <option key={c.id} value={c.name}>{c.name}</option>
                            ))}
                            {e.customer_name && !customers.some((c) => c.name === e.customer_name) && (
                              <option value={e.customer_name}>{e.customer_name}</option>
                            )}
                          </select>
                        </td>
                        <td style={{ minWidth: "150px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="Model..."
                            defaultValue={e.model_name || ""}
                            key={`ecn-mdl-${e.id}-${e.model_name || ""}`}
                            onKeyDown={(ev) => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); }}
                            onBlur={async (ev) => {
                              const val = ev.target.value.trim();
                              if (val !== (e.model_name || "")) {
                                await handleInlineEcnUpdate(e.id, { model_name: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <select
                            className="table-inline-select"
                            value={e.query_status || "Open"}
                            key={`ecn-qs-${e.id}-${e.query_status || ""}`}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.query_status || "")) {
                                await handleInlineEcnUpdate(e.id, { query_status: val });
                              }
                            }}
                          >
                            {RFQ_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-inline-input"
                            defaultValue={e.unique_list_share_date || ""}
                            key={`ecn-ulsd-${e.id}-${e.unique_list_share_date || ""}`}
                            onClick={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onFocus={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.unique_list_share_date || "")) {
                                await handleInlineEcnUpdate(e.id, { unique_list_share_date: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "150px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="Unique RFQ No..."
                            defaultValue={e.unique_rfq_no || ""}
                            key={`ecn-urfq-${e.id}-${e.unique_rfq_no || ""}`}
                            onKeyDown={(ev) => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); }}
                            onBlur={async (ev) => {
                              const val = ev.target.value.trim();
                              if (val !== (e.unique_rfq_no || "")) {
                                await handleInlineEcnUpdate(e.id, { unique_rfq_no: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <select
                            className="table-inline-select"
                            value={e.unique_status || "Open"}
                            key={`ecn-us-${e.id}-${e.unique_status || ""}`}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.unique_status || "")) {
                                await handleInlineEcnUpdate(e.id, { unique_status: val });
                              }
                            }}
                          >
                            {RFQ_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-inline-input"
                            defaultValue={e.sap_bom_upload_date || ""}
                            key={`ecn-sbup-${e.id}-${e.sap_bom_upload_date || ""}`}
                            onClick={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onFocus={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.sap_bom_upload_date || "")) {
                                await handleInlineEcnUpdate(e.id, { sap_bom_upload_date: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-inline-input"
                            defaultValue={e.sap_bom_released_date || ""}
                            key={`ecn-sbrl-${e.id}-${e.sap_bom_released_date || ""}`}
                            onClick={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onFocus={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.sap_bom_released_date || "")) {
                                await handleInlineEcnUpdate(e.id, { sap_bom_released_date: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-inline-input"
                            defaultValue={e.prd_bom_release_date || ""}
                            key={`ecn-pdbrl-${e.id}-${e.prd_bom_release_date || ""}`}
                            onClick={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onFocus={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.prd_bom_release_date || "")) {
                                await handleInlineEcnUpdate(e.id, { prd_bom_release_date: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-inline-input"
                            defaultValue={e.label_upload_date || ""}
                            key={`ecn-lbup-${e.id}-${e.label_upload_date || ""}`}
                            onClick={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onFocus={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.label_upload_date || "")) {
                                await handleInlineEcnUpdate(e.id, { label_upload_date: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-inline-input"
                            defaultValue={e.min_by_engineer_date || ""}
                            key={`ecn-mbe-${e.id}-${e.min_by_engineer_date || ""}`}
                            onClick={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onFocus={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.min_by_engineer_date || "")) {
                                await handleInlineEcnUpdate(e.id, { min_by_engineer_date: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-inline-input"
                            defaultValue={e.min_by_ppc || ""}
                            key={`ecn-mbp-${e.id}-${e.min_by_ppc || ""}`}
                            onClick={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onFocus={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.min_by_ppc || "")) {
                                await handleInlineEcnUpdate(e.id, { min_by_ppc: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "120px", padding: "4px" }}>
                          <select
                            className="table-inline-select"
                            value={e.min_status || "Open"}
                            key={`ecn-ms-${e.id}-${e.min_status || ""}`}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.min_status || "")) {
                                await handleInlineEcnUpdate(e.id, { min_status: val });
                              }
                            }}
                          >
                            {ECN_MIN_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ minWidth: "160px", padding: "4px" }}>
                          <input
                            type="text"
                            className="table-inline-input"
                            placeholder="Review..."
                            defaultValue={e.review || ""}
                            key={`ecn-rev-${e.id}-${e.review || ""}`}
                            onKeyDown={(ev) => { if (ev.key === "Enter") (ev.target as HTMLInputElement).blur(); }}
                            onBlur={async (ev) => {
                              const val = ev.target.value.trim();
                              if (val !== (e.review || "")) {
                                await handleInlineEcnUpdate(e.id, { review: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <select
                            className="table-inline-select"
                            value={e.overall_status || "Open"}
                            key={`ecn-ovs-${e.id}-${e.overall_status || ""}`}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.overall_status || "")) {
                                await handleInlineEcnUpdate(e.id, { overall_status: val });
                              }
                            }}
                          >
                            {ECN_OVERALL_STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ minWidth: "100px", padding: "4px" }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="table-inline-input"
                            placeholder="Circuits"
                            defaultValue={e.no_of_ckt !== undefined && e.no_of_ckt !== null ? String(e.no_of_ckt) : ""}
                            key={`ecn-ckt-${e.id}-${e.no_of_ckt ?? ""}`}
                            onKeyDown={(ev) => {
                              if (!/[0-9]/.test(ev.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(ev.key)) {
                                ev.preventDefault();
                              }
                              if (ev.key === "Enter") (ev.target as HTMLInputElement).blur();
                            }}
                            onBlur={async (ev) => {
                              const cleanVal = ev.target.value.replace(/[^0-9]/g, "");
                              const numVal = cleanVal ? Number(cleanVal) : null;
                              if (numVal !== (e.no_of_ckt ?? null)) {
                                await handleInlineEcnUpdate(e.id, { no_of_ckt: numVal });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "110px", padding: "4px" }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="table-inline-input"
                            placeholder="Volume"
                            defaultValue={e.volume !== undefined && e.volume !== null ? String(e.volume) : ""}
                            key={`ecn-vol-${e.id}-${e.volume ?? ""}`}
                            onKeyDown={(ev) => {
                              if (!/[0-9]/.test(ev.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(ev.key)) {
                                ev.preventDefault();
                              }
                              if (ev.key === "Enter") (ev.target as HTMLInputElement).blur();
                            }}
                            onBlur={async (ev) => {
                              const cleanVal = ev.target.value.replace(/[^0-9]/g, "");
                              const numVal = cleanVal ? Number(cleanVal) : null;
                              if (numVal !== (e.volume ?? null)) {
                                await handleInlineEcnUpdate(e.id, { volume: numVal });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-inline-input"
                            defaultValue={e.work_start_date || ""}
                            key={`ecn-wsd-${e.id}-${e.work_start_date || ""}`}
                            onClick={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onFocus={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.work_start_date || "")) {
                                await handleInlineEcnUpdate(e.id, { work_start_date: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-inline-input"
                            defaultValue={e.target_date || ""}
                            key={`ecn-td-${e.id}-${e.target_date || ""}`}
                            onClick={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onFocus={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.target_date || "")) {
                                await handleInlineEcnUpdate(e.id, { target_date: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          <input
                            type="date"
                            className="table-inline-input"
                            defaultValue={e.completion_date || e.actual_date || ""}
                            key={`ecn-act-${e.id}-${e.completion_date || e.actual_date || ""}`}
                            onClick={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onFocus={(ev) => { try { (ev.currentTarget as any).showPicker?.(); } catch { } }}
                            onChange={async (ev) => {
                              const val = ev.target.value;
                              if (val !== (e.completion_date || e.actual_date || "")) {
                                await handleInlineEcnUpdate(e.id, { completion_date: val, actual_date: val });
                              }
                            }}
                          />
                        </td>
                        <td style={{ minWidth: "140px", padding: "4px" }}>
                          {e.is_deleted ? (
                            <span className="badge badge-cancelled" style={{ fontSize: "11px" }}>Permanently Deleted</span>
                          ) : (
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                className="btn btn-outline"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                onClick={() => {
                                  setModalType("edit_ecn");
                                  setModalData({
                                    ...e,
                                    no_of_ckt: e.no_of_ckt !== undefined && e.no_of_ckt !== null ? String(e.no_of_ckt) : "",
                                    volume: e.volume !== undefined && e.volume !== null ? String(e.volume) : ""
                                  });
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-outline"
                                style={{ padding: "4px 8px", fontSize: "11px", color: "#f87171", borderColor: "rgba(239, 68, 68, 0.4)" }}
                                title="Delete ECN"
                                onClick={() => setDeleteConfirmTarget({ id: e.id, targetNum: e.ecn_number || String(e.id), type: "ecn" })}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BOM & LABEL UPLOAD */}
        {activeTab === 4 && (
          <div>
            <div className="page-header-bar">
              <div>
                <h1 className="page-title">SAP BOM & Label Upload Management</h1>
                <p className="page-subtitle">Unique FG Code + Alternate sequencing and mandatory release before label upload</p>
              </div>
              <div className="header-actions">
                <button className="btn btn-outline" onClick={() => handleExport("bom", "xlsx")}>
                  <Download size={15} /> Export BOMs
                </button>
                <button className="btn" onClick={() => { setModalType("upload_bom"); setModalData({}); }}>
                  <Plus size={16} /> Upload SAP BOM
                </button>
              </div>
            </div>

            <div className="card-panel">
              <div className="card-panel-title" style={{ marginBottom: "14px" }}>SAP BOM Release Registry</div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>FG Code</th>
                      <th>BOM Alt</th>
                      <th>Customer P/N & Rev</th>
                      <th>FG Rev</th>
                      <th>Linked ECN</th>
                      <th>Uploaded By & Date</th>
                      <th>Release Date</th>
                      <th>BOM Status</th>
                      <th>Label Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boms.map(b => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 700, color: "#38bdf8" }}>{b.fg_code}</td>
                        <td><span className="badge badge-open">Alt {b.bom_alternate}</span></td>
                        <td>{b.customer_part_number} (Rev {b.customer_revision})</td>
                        <td><b>{b.fg_revision}</b></td>
                        <td>{b.ecn_number}</td>
                        <td>{b.uploaded_by_name} ({b.upload_date})</td>
                        <td>{b.release_date || <span style={{ color: "#f59e0b" }}>Pending</span>}</td>
                        <td>
                          <span className={`badge ${b.bom_status === "Released" ? "badge-released" : "badge-in-progress"}`}>
                            {b.bom_status}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${b.label_status === "Uploaded" ? "badge-completed" : "badge-delayed"}`}>
                            {b.label_status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "4px" }}>
                            {!b.release_date ? (
                              <button
                                className="btn btn-success"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                onClick={() => { setModalType("release_bom"); setModalData(b); }}
                              >
                                Release
                              </button>
                            ) : (
                              <button
                                className="btn btn-outline"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                onClick={() => { setModalType("upload_label"); setModalData({ bom_id: b.id, fg_code: b.fg_code, bom_alternate: b.bom_alternate }); }}
                              >
                                + Label
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Label Upload History */}
            <div className="card-panel">
              <div className="card-panel-title" style={{ marginBottom: "14px" }}>Label Upload Historical Audit Trail</div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>FG Code</th>
                      <th>BOM Alt</th>
                      <th>Uploaded By</th>
                      <th>Upload Date</th>
                      <th>Reason / Engineering Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labels.map(l => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600, color: "#38bdf8" }}>{l.fg_code}</td>
                        <td>Alt {l.bom_alternate}</td>
                        <td>{l.uploaded_by_name}</td>
                        <td>{l.upload_date}</td>
                        <td>{l.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CONSOLIDATED ACTIVE KIT LIST */}
        {activeTab === 5 && (
          <div>
            <div className="page-header-bar">
              <div>
                <h1 className="page-title">Consolidated Active Kit List</h1>
                <p className="page-subtitle">Auto-generated view populated strictly upon MIN meeting conclusion</p>
              </div>
              <div className="header-actions">
                <button className="btn btn-outline" onClick={() => handleExport("kit", "xlsx")}>
                  <Download size={15} /> Export Excel
                </button>
              </div>
            </div>

            <div className="card-panel">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ECN Number</th>
                      <th>MIN Meeting Date</th>
                      <th>Customer & Model</th>
                      <th>Harness</th>
                      <th>Revision</th>
                      <th>SOP Number</th>
                      <th>Volume</th>
                      <th>Circuits</th>
                      <th>Context</th>
                      <th>Rack No</th>
                      <th>File No</th>
                      <th>Hard Copy Location</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kits.map(k => (
                      <tr key={k.kit_id}>
                        <td style={{ fontWeight: 600, color: "#38bdf8" }}>{k.ecn_number}</td>
                        <td><span style={{ color: "#34d399" }}>{k.min_meeting_date}</span></td>
                        <td>{k.customer_name} ({k.model_name})</td>
                        <td><b>{k.harness_number}</b></td>
                        <td><span className="badge badge-active">Rev {k.revision_code}</span></td>
                        <td>{k.sop_number}</td>
                        <td>{Number(k.volume).toLocaleString()}</td>
                        <td>{k.circuit_count}</td>
                        <td><span className="badge badge-in-progress">{k.stage_context}</span></td>
                        <td><b>{k.rack_number}</b></td>
                        <td><b>{k.file_number}</b></td>
                        <td>{k.hard_copy_location}</td>
                        <td>
                          <button
                            className="btn btn-outline"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => { setModalType("kit_details"); setModalData(k); }}
                          >
                            Edit Location
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PROJECT KIT LIST */}
        {activeTab === 6 && (
          <div>
            <div className="page-header-bar">
              <div>
                <h1 className="page-title">Individual Project / Model Kit List</h1>
                <p className="page-subtitle">Unified project lifecycle aggregator across RFQs, ECNs, Revisions, BOMs, and Kit locations</p>
              </div>
              <div className="header-actions">
                <select
                  value={selectedProjectId}
                  onChange={e => setSelectedProjectId(e.target.value)}
                  style={{ minWidth: "220px" }}
                >
                  <option value="">Select Model / Project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.customer_name} — {p.model_name}</option>
                  ))}
                </select>
                <button className="btn btn-outline" onClick={() => handleExport("project_kit", "xlsx")}>
                  <Download size={15} /> Export Project Kit
                </button>
              </div>
            </div>

            <div className="card-panel">
              {selectedProjectId ? (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Harness</th>
                        <th>Rev</th>
                        <th>SOP Number</th>
                        <th>Volume</th>
                        <th>Circuits</th>
                        <th>ECN Number</th>
                        <th>Stage Context</th>
                        <th>Engineer</th>
                        <th>BOM FG & Alt</th>
                        <th>BOM Status</th>
                        <th>Label Status</th>
                        <th>MIN Date</th>
                        <th>Rack / File</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectKitRows.map((r, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, color: "#38bdf8" }}>{r.harness}</td>
                          <td>{r.revision ? <span className="badge badge-active">{r.revision}</span> : "-"}</td>
                          <td>{r.sop_number || "-"}</td>
                          <td>{r.volume ? Number(r.volume).toLocaleString() : "-"}</td>
                          <td>{r.circuit_count || "-"}</td>
                          <td>{r.ecn_number || "-"}</td>
                          <td>{r.stage_context ? <span className="badge badge-in-progress">{r.stage_context}</span> : "-"}</td>
                          <td>{r.primary_engineer || "-"}</td>
                          <td>{r.bom_fg ? `${r.bom_fg} (${r.bom_alternate})` : "-"}</td>
                          <td>
                            <span className={`badge ${r.bom_status === "Released" ? "badge-released" : "badge-open"}`}>
                              {r.bom_status}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${r.label_status === "Uploaded" ? "badge-completed" : "badge-delayed"}`}>
                              {r.label_status}
                            </span>
                          </td>
                          <td>{r.min_meeting_date ? <span style={{ color: "#34d399" }}>{r.min_meeting_date}</span> : "-"}</td>
                          <td>{r.rack_number} / {r.file_number}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                  Please select a Project/Model above to load its consolidated engineering kit view.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 7: MASTER DATA */}
        {activeTab === 7 && (
          <div>
            <div className="page-header-bar">
              <div>
                <h1 className="page-title">Master Data Management</h1>
                <p className="page-subtitle">Customers, Engineers, Projects, Harnesses, and Revisions lifecycle</p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {/* Customers Master */}
              <div className="card-panel">
                <div className="card-panel-header">
                  <div className="card-panel-title">Customer Master</div>
                  <button className="btn" onClick={() => { setModalType("new_customer"); setModalData({}); }}>
                    <Plus size={15} /> Add Customer
                  </button>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Customer Name</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {customers.map(c => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td>
                            <span className={`badge ${c.is_active ? "badge-active" : "badge-obsolete"}`}>
                              {c.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Engineers Master */}
              <div className="card-panel">
                <div className="card-panel-header">
                  <div className="card-panel-title">Engineer Master</div>
                  <button className="btn" onClick={() => { setModalType("new_engineer"); setModalData({}); }}>
                    <Plus size={15} /> Add Engineer
                  </button>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Engineer Name</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {engineers.map(e => (
                        <tr key={e.id}>
                          <td style={{ fontWeight: 600 }}>{e.name}</td>
                          <td>
                            <span className={`badge ${e.is_active ? "badge-active" : "badge-obsolete"}`}>
                              {e.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Projects Master */}
              <div className="card-panel">
                <div className="card-panel-header">
                  <div className="card-panel-title">Projects / Models</div>
                  <button className="btn" onClick={() => { setModalType("new_project"); setModalData({}); }}>
                    <Plus size={15} /> Add Model
                  </button>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Customer</th><th>Model Name</th></tr>
                    </thead>
                    <tbody>
                      {projects.map(p => (
                        <tr key={p.id}>
                          <td>{p.customer_name}</td>
                          <td style={{ fontWeight: 600, color: "#38bdf8" }}>{p.model_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Revisions Control */}
              <div className="card-panel">
                <div className="card-panel-header">
                  <div className="card-panel-title">Revisions (Single-Active Poka-Yoke)</div>
                  <button className="btn" onClick={() => { setModalType("new_revision"); setModalData({}); }}>
                    <Plus size={15} /> Add Revision
                  </button>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>Harness</th><th>Rev</th><th>SOP</th><th>Circuits</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                      {revisions.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{r.harness_number}</td>
                          <td><b>{r.revision_code}</b></td>
                          <td>{r.sop_number}</td>
                          <td>{r.circuit_count}</td>
                          <td>
                            <span className={`badge ${r.status === "Active" ? "badge-active" : "badge-obsolete"}`}>
                              {r.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-outline"
                              style={{ padding: "2px 6px", fontSize: "11px" }}
                              onClick={() => toggleRevisionStatus(r.id, r.status)}
                            >
                              Toggle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 3. MODAL DIALOGS FOR POKA-YOKE INPUTS */}
      {modalType && (
        <div className="modal-overlay">
          <div className={`modal-card ${modalType === "new_rfq" || modalType === "edit_rfq" ? "modal-card-lg" : ""}`}>
            <div className="modal-header">
              <div className="modal-title">
                {modalType === "new_customer" && "Add New Customer"}
                {modalType === "new_engineer" && "Add New Engineer"}
                {modalType === "new_project" && "Create Customer Model / Project"}
                {modalType === "new_harness" && "Register Globally Unique Harness"}
                {modalType === "new_revision" && "Add Harness Revision"}
                {modalType === "new_rfq" && "Create RFQ — Costing & Milestone Tracking"}
                {modalType === "edit_rfq" && `Update RFQ — ${modalData.sr_no || modalData.rfq_number || ""}`}
                {modalType === "new_ecn" && "Create ECN"}
                {modalType === "edit_ecn" && `Update ECN — ${modalData.ecn_number}`}
                {modalType === "upload_bom" && "Upload SAP BOM (FG Code + Alternate)"}
                {modalType === "release_bom" && `Release SAP BOM — ${modalData.fg_code}`}
                {modalType === "upload_label" && `Upload Label — ${modalData.fg_code} (Alt ${modalData.bom_alternate})`}
                {modalType === "record_min" && `Record MIN Meeting — ${modalData.ecn_number}`}
                {modalType === "kit_details" && `Consolidated Kit Storage Details — ${modalData.ecn_number}`}
              </div>
              <button
                onClick={() => { setModalType(null); setModalError(null); }}
                style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden" }}>
              <div className="modal-body">
                {modalError && (
                  <div className="error-banner">
                    ⚠️ {modalError}
                  </div>
                )}

                {/* FORM: NEW CUSTOMER */}
                {modalType === "new_customer" && (
                  <div className="form-group">
                    <label className="form-label">Customer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tata Motors"
                      value={modalData.name || ""}
                      onChange={e => setModalData({ ...modalData, name: e.target.value })}
                    />
                  </div>
                )}

                {/* FORM: NEW ENGINEER */}
                {modalType === "new_engineer" && (
                  <div className="form-group">
                    <label className="form-label">Engineer Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Amit Verma"
                      value={modalData.name || ""}
                      onChange={e => setModalData({ ...modalData, name: e.target.value })}
                    />
                  </div>
                )}

                {/* FORM: NEW PROJECT */}
                {modalType === "new_project" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Customer *</label>
                      <select
                        required
                        value={modalData.customer_id || ""}
                        onChange={e => setModalData({ ...modalData, customer_id: e.target.value })}
                      >
                        <option value="">Select Customer...</option>
                        {customers.filter(c => c.is_active).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Model Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Nexon-EV"
                        value={modalData.model_name || ""}
                        onChange={e => setModalData({ ...modalData, model_name: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* FORM: NEW HARNESS */}
                {modalType === "new_harness" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Project / Model *</label>
                      <select
                        required
                        value={modalData.project_id || ""}
                        onChange={e => setModalData({ ...modalData, project_id: e.target.value })}
                      >
                        <option value="">Select Model...</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.customer_name} — {p.model_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Harness Number (Globally Unique) *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. HARN-NXN-MAIN-01"
                        value={modalData.harness_number || ""}
                        onChange={e => setModalData({ ...modalData, harness_number: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </>
                )}

                {/* FORM: NEW REVISION */}
                {modalType === "new_revision" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Harness *</label>
                      <select
                        required
                        value={modalData.harness_id || ""}
                        onChange={e => setModalData({ ...modalData, harness_id: e.target.value })}
                      >
                        <option value="">Select Harness...</option>
                        {harnesses.map(h => (
                          <option key={h.id} value={h.id}>{h.harness_number} ({h.customer_name} - {h.model_name})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Revision Code *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. B or 02"
                          value={modalData.revision_code || ""}
                          onChange={e => setModalData({ ...modalData, revision_code: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">SOP Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. SOP-002"
                          value={modalData.sop_number || ""}
                          onChange={e => setModalData({ ...modalData, sop_number: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Annual Volume *</label>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 15000"
                          value={modalData.volume || ""}
                          onChange={e => setModalData({ ...modalData, volume: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Circuit Count *</label>
                        <input
                          type="number"
                          required
                          placeholder="e.g. 88"
                          value={modalData.circuit_count || ""}
                          onChange={e => setModalData({ ...modalData, circuit_count: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Initial Status</label>
                      <select
                        value={modalData.status || "Active"}
                        onChange={e => setModalData({ ...modalData, status: e.target.value })}
                      >
                        <option value="Active">Active (Requires other revisions to be Obsolete)</option>
                        <option value="Obsolete">Obsolete</option>
                      </select>
                    </div>
                  </>
                )}

                {/* FORM: NEW RFQ */}
                {modalType === "new_rfq" && (
                  <>
                    <div className="form-section-title">1. RFQ & Part Identification</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Sr .No (unique RFQ No.)</label>
                        <input
                          type="text"
                          placeholder="Auto-generated e.g. RFQ618260001"
                          value={modalData.sr_no || modalData.rfq_number || ""}
                          onChange={e => setModalData({ ...modalData, sr_no: e.target.value, rfq_number: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Customer Name</label>
                        <select
                          value={modalData.customer_name || ""}
                          onChange={e => setModalData({ ...modalData, customer_name: e.target.value })}
                        >
                          <option value="">Select Customer from Customer Master...</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                          {modalData.customer_name && !customers.some(c => c.name === modalData.customer_name) && (
                            <option value={modalData.customer_name}>{modalData.customer_name}</option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Model</label>
                        <input
                          type="text"
                          placeholder="e.g. Scorpio-EV or Nexon-EV"
                          value={modalData.model || ""}
                          onChange={e => setModalData({ ...modalData, model: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Drawing Number</label>
                        <input
                          type="text"
                          placeholder="e.g. DWG-2026-X88"
                          value={modalData.drawing_number || ""}
                          onChange={e => setModalData({ ...modalData, drawing_number: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unique RFQ No.</label>
                      <input
                        type="text"
                        placeholder="Auto-generated e.g. RFQ618260001"
                        value={modalData.unique_rfq_no || modalData.rfq_number || ""}
                        onChange={e => setModalData({ ...modalData, unique_rfq_no: e.target.value })}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Harness Part No.</label>
                        <input
                          type="text"
                          list="harness-datalist"
                          placeholder="Enter harness part no. (any text or number)"
                          value={modalData.harness_part_no || ""}
                          onChange={e => {
                            const val = e.target.value;
                            const matched = harnesses.find(h => h.harness_number === val);
                            if (matched) {
                              setModalData({
                                ...modalData,
                                harness_part_no: val,
                                harness_id: matched.id,
                                description: modalData.description || `${matched.customer_name} - ${matched.model_name}`
                              });
                            } else {
                              setModalData({ ...modalData, harness_part_no: val, harness_id: "" });
                            }
                          }}
                        />
                        <datalist id="harness-datalist">
                          {harnesses.map(h => (
                            <option key={h.id} value={h.harness_number}>{h.harness_number} ({h.customer_name} - {h.model_name})</option>
                          ))}
                        </datalist>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Customer Revision</label>
                        <input
                          type="text"
                          placeholder="Enter customer revision (e.g. 01, A, Rev-2)"
                          value={modalData.customer_revision || ""}
                          onChange={e => setModalData({ ...modalData, customer_revision: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">FG Code</label>
                        <input
                          type="text"
                          placeholder="e.g. FG-NXN-MAIN-901 (any text or number)"
                          value={modalData.fg_code || ""}
                          onChange={e => setModalData({ ...modalData, fg_code: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">FG Rev</label>
                        <input
                          type="text"
                          placeholder="e.g. BA or 01 (any text or number)"
                          value={modalData.fg_rev || ""}
                          onChange={e => setModalData({ ...modalData, fg_rev: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Main Body Wiring Harness (any text or number)"
                        value={modalData.description || ""}
                        onChange={e => setModalData({ ...modalData, description: e.target.value })}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">No. of ckt (Circuits)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 88 (digits only)"
                          value={modalData.no_of_ckt !== undefined ? modalData.no_of_ckt : ""}
                          onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={e => setModalData({ ...modalData, no_of_ckt: e.target.value.replace(/[^0-9]/g, "") })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Volume (Annual Volume)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 14500 (digits only)"
                          value={modalData.volume !== undefined ? modalData.volume : ""}
                          onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={e => setModalData({ ...modalData, volume: e.target.value.replace(/[^0-9]/g, "") })}
                        />
                      </div>
                    </div>

                    <div className="form-section-title">2. Input & Milestone Dates</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Marketing Input Received Date
                        </label>
                        <input
                          type="date"
                          value={modalData.marketing_input_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, marketing_input_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Design Input Received Date
                        </label>
                        <input
                          type="date"
                          value={modalData.design_input_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, design_input_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row-3">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Start Date
                        </label>
                        <input
                          type="date"
                          value={modalData.work_start_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, work_start_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Target Date
                        </label>
                        <input
                          type="date"
                          value={modalData.target_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, target_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Actual Date
                        </label>
                        <input
                          type="date"
                          value={modalData.completion_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, completion_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-section-title">3. Customer Query Tracking</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Query Sent Date
                        </label>
                        <input
                          type="date"
                          value={modalData.query_submitted_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, query_submitted_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Query Resolve Date
                        </label>
                        <input
                          type="date"
                          value={modalData.reply_received_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, reply_received_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Query Type</label>
                        <select
                          value={modalData.query_type || ""}
                          onChange={e => setModalData({ ...modalData, query_type: e.target.value })}
                        >
                          <option value="">Select Query Type...</option>
                          {QUERY_TYPE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Query Status</label>
                        <select
                          value={modalData.query_status || "Open"}
                          onChange={e => {
                            const val = e.target.value;
                            const isAll = (val.toLowerCase() === "close" || val.toLowerCase() === "closed") &&
                              ((modalData.unique_status || "Open").toLowerCase() === "close" || (modalData.unique_status || "Open").toLowerCase() === "closed") &&
                              ((modalData.costing_bom_status || "Open").toLowerCase() === "close" || (modalData.costing_bom_status || "Open").toLowerCase() === "closed");
                            setModalData({
                              ...modalData,
                              query_status: val,
                              query_yes_no: val !== "Close",
                              overall_rfq_status: isAll ? "Close" : (modalData.overall_rfq_status === "Close" ? "Open" : (modalData.overall_rfq_status || "Open"))
                            });
                          }}
                        >
                          {RFQ_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-section-title">4. Unique List & Costing BOM</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Unique List Share Date
                        </label>
                        <input
                          type="date"
                          value={modalData.unique_list_share_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, unique_list_share_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Unique Status</label>
                        <select
                          value={modalData.unique_status || "Open"}
                          onChange={e => {
                            const val = e.target.value;
                            const isAll = ((modalData.query_status || "Open").toLowerCase() === "close" || (modalData.query_status || "Open").toLowerCase() === "closed") &&
                              (val.toLowerCase() === "close" || val.toLowerCase() === "closed") &&
                              ((modalData.costing_bom_status || "Open").toLowerCase() === "close" || (modalData.costing_bom_status || "Open").toLowerCase() === "closed");
                            setModalData({
                              ...modalData,
                              unique_status: val,
                              overall_rfq_status: isAll ? "Close" : (modalData.overall_rfq_status === "Close" ? "Open" : (modalData.overall_rfq_status || "Open"))
                            });
                          }}
                        >
                          {RFQ_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row-3">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Costing BOM Prepare Date
                        </label>
                        <input
                          type="date"
                          value={modalData.costing_bom_prepare_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, costing_bom_prepare_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Costing BOM Shared Date
                        </label>
                        <input
                          type="date"
                          value={modalData.costing_bom_submitted_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, costing_bom_submitted_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Costing BOM Status</label>
                        <select
                          value={modalData.costing_bom_status || "Open"}
                          onChange={e => {
                            const val = e.target.value;
                            const isAll = ((modalData.query_status || "Open").toLowerCase() === "close" || (modalData.query_status || "Open").toLowerCase() === "closed") &&
                              ((modalData.unique_status || "Open").toLowerCase() === "close" || (modalData.unique_status || "Open").toLowerCase() === "closed") &&
                              (val.toLowerCase() === "close" || val.toLowerCase() === "closed");
                            setModalData({
                              ...modalData,
                              costing_bom_status: val,
                              overall_rfq_status: isAll ? "Close" : (modalData.overall_rfq_status === "Close" ? "Open" : (modalData.overall_rfq_status || "Open"))
                            });
                          }}
                        >
                          {COSTING_BOM_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-section-title">5. Status & Remarks</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Over all status</label>
                        <select
                          value={
                            (((modalData.query_status || "Open").toLowerCase() === "close" || (modalData.query_status || "Open").toLowerCase() === "closed") &&
                             ((modalData.unique_status || "Open").toLowerCase() === "close" || (modalData.unique_status || "Open").toLowerCase() === "closed") &&
                             ((modalData.costing_bom_status || "Open").toLowerCase() === "close" || (modalData.costing_bom_status || "Open").toLowerCase() === "closed"))
                              ? "Close"
                              : (modalData.overall_rfq_status === "Close" ? "Open" : (modalData.overall_rfq_status || "Open"))
                          }
                          onChange={e => setModalData({ ...modalData, overall_rfq_status: e.target.value })}
                        >
                          {OVERALL_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Name (Engineer Master)</label>
                        <select
                          value={modalData.engineer_id || ""}
                          onChange={e => {
                            const engId = e.target.value ? Number(e.target.value) : null;
                            const eng = engineers.find(item => item.id === engId);
                            setModalData({
                              ...modalData,
                              engineer_id: engId,
                              engineer_name: eng ? eng.name : ""
                            });
                          }}
                        >
                          <option value="">Select Name from Engineer Master...</option>
                          {engineers.filter(e => e.is_active || e.id === Number(modalData.engineer_id)).map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Remark</label>
                        <input
                          type="text"
                          placeholder="Remark or engineering notes"
                          value={modalData.remark || ""}
                          onChange={e => setModalData({ ...modalData, remark: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Review Note</label>
                        <input
                          type="text"
                          placeholder="Review note before actions"
                          value={modalData.review_note || ""}
                          onChange={e => setModalData({ ...modalData, review_note: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ marginTop: "14px", padding: "12px 14px", background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.25)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <input
                        type="checkbox"
                        id="create_ecn_checkbox"
                        style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#38bdf8" }}
                        checked={Boolean(modalData.create_ecn)}
                        onChange={e => setModalData({ ...modalData, create_ecn: e.target.checked })}
                      />
                      <label htmlFor="create_ecn_checkbox" style={{ cursor: "pointer", margin: 0, fontWeight: 600, color: "#e2e8f0", fontSize: "13px" }}>
                        Create ECN immediately as well? (Autofills ECN Sheet with RFQ data)
                      </label>
                    </div>
                  </>
                )}

                {/* FORM: EDIT RFQ */}
                {modalType === "edit_rfq" && (
                  <>
                    <div style={{ background: "#0b1120", padding: "10px 14px", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Linked Harness & Model: </span>
                      <span style={{ color: "#38bdf8", fontWeight: 700 }}>{modalData.harness_part_no || modalData.harness_number || "Harness"}</span>
                      <span style={{ color: "#94a3b8" }}> | Customer Rev: </span>
                      <span style={{ color: "#34d399", fontWeight: 700 }}>{modalData.customer_revision || modalData.revision_code || "Rev"}</span>
                      {(modalData.model || modalData.model_name || modalData.customer_name) && (
                        <span style={{ color: "#e2e8f0" }}> ({modalData.customer_name ? `${modalData.customer_name} - ` : ""}{modalData.model || modalData.model_name})</span>
                      )}
                    </div>

                    <div className="form-section-title">1. RFQ & Part Identification</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Sr .No (unique RFQ No.)</label>
                        <input
                          type="text"
                          value={modalData.sr_no || ""}
                          onChange={e => setModalData({ ...modalData, sr_no: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Customer Name</label>
                        <select
                          value={modalData.customer_name || ""}
                          onChange={e => setModalData({ ...modalData, customer_name: e.target.value })}
                        >
                          <option value="">Select Customer from Customer Master...</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                          {modalData.customer_name && !customers.some(c => c.name === modalData.customer_name) && (
                            <option value={modalData.customer_name}>{modalData.customer_name}</option>
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Model</label>
                        <input
                          type="text"
                          placeholder="e.g. Scorpio-EV or Nexon-EV"
                          value={modalData.model || ""}
                          onChange={e => setModalData({ ...modalData, model: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Drawing Number</label>
                        <input
                          type="text"
                          placeholder="e.g. DWG-2026-X88"
                          value={modalData.drawing_number || ""}
                          onChange={e => setModalData({ ...modalData, drawing_number: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Unique RFQ No.</label>
                      <input
                        type="text"
                        value={modalData.unique_rfq_no || ""}
                        onChange={e => setModalData({ ...modalData, unique_rfq_no: e.target.value })}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Harness Part No.</label>
                        <input
                          type="text"
                          placeholder="e.g. 12345 or HARN-NXN-01 (any text or number)"
                          value={modalData.harness_part_no !== undefined ? modalData.harness_part_no : (modalData.harness_number || "")}
                          onChange={e => setModalData({ ...modalData, harness_part_no: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Customer Revision</label>
                        <input
                          type="text"
                          placeholder="e.g. 01, A, Rev-2 (any text or number)"
                          value={modalData.customer_revision !== undefined ? modalData.customer_revision : (modalData.revision_code || "")}
                          onChange={e => setModalData({ ...modalData, customer_revision: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">FG Code</label>
                        <input
                          type="text"
                          placeholder="e.g. FG-NXN-MAIN-901"
                          value={modalData.fg_code || ""}
                          onChange={e => setModalData({ ...modalData, fg_code: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">FG Rev</label>
                        <input
                          type="text"
                          placeholder="e.g. BA"
                          value={modalData.fg_rev || ""}
                          onChange={e => setModalData({ ...modalData, fg_rev: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Main Body Wiring Harness"
                        value={modalData.description || ""}
                        onChange={e => setModalData({ ...modalData, description: e.target.value })}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">No. of ckt (Circuits)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 88 (digits only)"
                          value={modalData.no_of_ckt !== undefined ? modalData.no_of_ckt : ""}
                          onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={e => setModalData({ ...modalData, no_of_ckt: e.target.value.replace(/[^0-9]/g, "") })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Volume (Annual Volume)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 14500 (digits only)"
                          value={modalData.volume !== undefined ? modalData.volume : ""}
                          onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={e => setModalData({ ...modalData, volume: e.target.value.replace(/[^0-9]/g, "") })}
                        />
                      </div>
                    </div>

                    <div className="form-section-title">2. Input & Milestone Dates</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Marketing Input Received Date
                        </label>
                        <input
                          type="date"
                          value={modalData.marketing_input_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, marketing_input_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Design Input Received Date
                        </label>
                        <input
                          type="date"
                          value={modalData.design_input_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, design_input_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row-3">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Start Date
                        </label>
                        <input
                          type="date"
                          value={modalData.work_start_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, work_start_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Target Date
                        </label>
                        <input
                          type="date"
                          value={modalData.target_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, target_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Actual Date
                        </label>
                        <input
                          type="date"
                          value={modalData.completion_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, completion_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-section-title">3. Customer Query Tracking</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Query Sent Date
                        </label>
                        <input
                          type="date"
                          value={modalData.query_submitted_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, query_submitted_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Query Resolve Date
                        </label>
                        <input
                          type="date"
                          value={modalData.reply_received_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, reply_received_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Query Type</label>
                        <select
                          value={modalData.query_type || ""}
                          onChange={e => setModalData({ ...modalData, query_type: e.target.value })}
                        >
                          <option value="">Select Query Type...</option>
                          {QUERY_TYPE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Query Status</label>
                        <select
                          value={modalData.query_status || "Open"}
                          onChange={e => {
                            const val = e.target.value;
                            const isAll = (val.toLowerCase() === "close" || val.toLowerCase() === "closed") &&
                              ((modalData.unique_status || "Open").toLowerCase() === "close" || (modalData.unique_status || "Open").toLowerCase() === "closed") &&
                              ((modalData.costing_bom_status || "Open").toLowerCase() === "close" || (modalData.costing_bom_status || "Open").toLowerCase() === "closed");
                            setModalData({
                              ...modalData,
                              query_status: val,
                              query_yes_no: val !== "Close",
                              overall_rfq_status: isAll ? "Close" : (modalData.overall_rfq_status === "Close" ? "Open" : (modalData.overall_rfq_status || "Open"))
                            });
                          }}
                        >
                          {RFQ_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-section-title">4. Unique List & Costing BOM</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Unique List Share Date
                        </label>
                        <input
                          type="date"
                          value={modalData.unique_list_share_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, unique_list_share_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Unique Status</label>
                        <select
                          value={modalData.unique_status || "Open"}
                          onChange={e => {
                            const val = e.target.value;
                            const isAll = ((modalData.query_status || "Open").toLowerCase() === "close" || (modalData.query_status || "Open").toLowerCase() === "closed") &&
                              (val.toLowerCase() === "close" || val.toLowerCase() === "closed") &&
                              ((modalData.costing_bom_status || "Open").toLowerCase() === "close" || (modalData.costing_bom_status || "Open").toLowerCase() === "closed");
                            setModalData({
                              ...modalData,
                              unique_status: val,
                              overall_rfq_status: isAll ? "Close" : (modalData.overall_rfq_status === "Close" ? "Open" : (modalData.overall_rfq_status || "Open"))
                            });
                          }}
                        >
                          {RFQ_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row-3">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Costing BOM Prepare Date
                        </label>
                        <input
                          type="date"
                          value={modalData.costing_bom_prepare_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, costing_bom_prepare_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Costing BOM Shared Date
                        </label>
                        <input
                          type="date"
                          value={modalData.costing_bom_submitted_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, costing_bom_submitted_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Costing BOM Status</label>
                        <select
                          value={modalData.costing_bom_status || "Open"}
                          onChange={e => {
                            const val = e.target.value;
                            const isAll = ((modalData.query_status || "Open").toLowerCase() === "close" || (modalData.query_status || "Open").toLowerCase() === "closed") &&
                              ((modalData.unique_status || "Open").toLowerCase() === "close" || (modalData.unique_status || "Open").toLowerCase() === "closed") &&
                              (val.toLowerCase() === "close" || val.toLowerCase() === "closed");
                            setModalData({
                              ...modalData,
                              costing_bom_status: val,
                              overall_rfq_status: isAll ? "Close" : (modalData.overall_rfq_status === "Close" ? "Open" : (modalData.overall_rfq_status || "Open"))
                            });
                          }}
                        >
                          {COSTING_BOM_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-section-title">5. Status & Remarks</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Over all status</label>
                        <select
                          value={
                            (((modalData.query_status || "Open").toLowerCase() === "close" || (modalData.query_status || "Open").toLowerCase() === "closed") &&
                             ((modalData.unique_status || "Open").toLowerCase() === "close" || (modalData.unique_status || "Open").toLowerCase() === "closed") &&
                             ((modalData.costing_bom_status || "Open").toLowerCase() === "close" || (modalData.costing_bom_status || "Open").toLowerCase() === "closed"))
                              ? "Close"
                              : (modalData.overall_rfq_status === "Close" ? "Open" : (modalData.overall_rfq_status || "Open"))
                          }
                          onChange={e => setModalData({ ...modalData, overall_rfq_status: e.target.value })}
                        >
                          {OVERALL_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Name (Engineer Master)</label>
                        <select
                          value={modalData.engineer_id || ""}
                          onChange={e => {
                            const engId = e.target.value ? Number(e.target.value) : null;
                            const eng = engineers.find(item => item.id === engId);
                            setModalData({
                              ...modalData,
                              engineer_id: engId,
                              engineer_name: eng ? eng.name : ""
                            });
                          }}
                        >
                          <option value="">Select Name from Engineer Master...</option>
                          {engineers.filter(e => e.is_active || e.id === Number(modalData.engineer_id)).map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Remark</label>
                        <input
                          type="text"
                          placeholder="Remark or engineering notes"
                          value={modalData.remark || ""}
                          onChange={e => setModalData({ ...modalData, remark: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Review Note</label>
                        <input
                          type="text"
                          placeholder="Review note before actions"
                          value={modalData.review_note || ""}
                          onChange={e => setModalData({ ...modalData, review_note: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* FORM: NEW ECN */}
                {modalType === "new_ecn" && (
                  <>
                    <div className="form-section-title">1. ECN & RFQ Identification</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">RFQ No.</label>
                        <input
                          type="text"
                          placeholder="e.g. RFQ618260001"
                          value={modalData.rfq_no || ""}
                          onChange={e => setModalData({ ...modalData, rfq_no: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Stage</label>
                        <select
                          value={modalData.stage || "sample"}
                          onChange={e => setModalData({ ...modalData, stage: e.target.value })}
                        >
                          {ECN_STAGE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Customer Name</label>
                        <select
                          value={modalData.customer_name || ""}
                          onChange={e => setModalData({ ...modalData, customer_name: e.target.value })}
                        >
                          <option value="">Select Customer from Customer Master...</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                          {modalData.customer_name && !customers.some(c => c.name === modalData.customer_name) && (
                            <option value={modalData.customer_name}>{modalData.customer_name}</option>
                          )}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Model Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Scorpio-EV"
                          value={modalData.model_name || ""}
                          onChange={e => setModalData({ ...modalData, model_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">No. of ckt (Circuits)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 88 (digits only)"
                          value={modalData.no_of_ckt !== undefined ? modalData.no_of_ckt : ""}
                          onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={e => setModalData({ ...modalData, no_of_ckt: e.target.value.replace(/[^0-9]/g, "") })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Volume</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 15000 (digits only)"
                          value={modalData.volume !== undefined ? modalData.volume : ""}
                          onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={e => setModalData({ ...modalData, volume: e.target.value.replace(/[^0-9]/g, "") })}
                        />
                      </div>
                    </div>

                    <div className="form-section-title">2. Timeline & Target Dates</div>
                    <div className="form-row-3">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Start Date
                        </label>
                        <input
                          type="date"
                          value={modalData.work_start_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, work_start_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Target Date
                        </label>
                        <input
                          type="date"
                          value={modalData.target_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, target_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Actual Date
                        </label>
                        <input
                          type="date"
                          value={modalData.completion_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, completion_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-section-title">3. Queries & Unique RFQ</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Query Status</label>
                        <select
                          value={modalData.query_status || "Open"}
                          onChange={e => setModalData({ ...modalData, query_status: e.target.value })}
                        >
                          {RFQ_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Unique List Share Date
                        </label>
                        <input
                          type="date"
                          value={modalData.unique_list_share_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, unique_list_share_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Unique RFQ No.</label>
                        <input
                          type="text"
                          placeholder="e.g. RFQ618260001"
                          value={modalData.unique_rfq_no || ""}
                          onChange={e => setModalData({ ...modalData, unique_rfq_no: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Unique Status</label>
                        <select
                          value={modalData.unique_status || "Open"}
                          onChange={e => setModalData({ ...modalData, unique_status: e.target.value })}
                        >
                          {RFQ_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-section-title">4. SAP BOM & Labels</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> SAP BOM Upload Date
                        </label>
                        <input
                          type="date"
                          value={modalData.sap_bom_upload_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, sap_bom_upload_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> SAP BOM Released Date
                        </label>
                        <input
                          type="date"
                          value={modalData.sap_bom_released_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, sap_bom_released_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> PRD BOM Release Date
                        </label>
                        <input
                          type="date"
                          value={modalData.prd_bom_release_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, prd_bom_release_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Label Upload Date
                        </label>
                        <input
                          type="date"
                          value={modalData.label_upload_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, label_upload_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-section-title">5. MIN & Overall Status</div>
                    <div className="form-row-3">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> MIN by Engineer Date
                        </label>
                        <input
                          type="date"
                          value={modalData.min_by_engineer_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, min_by_engineer_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> MIN by PPC
                        </label>
                        <input
                          type="date"
                          value={modalData.min_by_ppc || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, min_by_ppc: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">MIN Status</label>
                        <select
                          value={modalData.min_status || "Open"}
                          onChange={e => setModalData({ ...modalData, min_status: e.target.value })}
                        >
                          {ECN_MIN_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Over all status</label>
                        <select
                          value={modalData.overall_status || "Open"}
                          onChange={e => setModalData({ ...modalData, overall_status: e.target.value })}
                        >
                          {ECN_OVERALL_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Review</label>
                        <input
                          type="text"
                          placeholder="Review notes..."
                          value={modalData.review || ""}
                          onChange={e => setModalData({ ...modalData, review: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* FORM: EDIT ECN */}
                {modalType === "edit_ecn" && (
                  <>
                    <div style={{ background: "#0b1120", padding: "10px 14px", borderRadius: "8px", border: "1px solid #1e293b", marginBottom: "4px" }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: 600 }}>Editing ECN: </span>
                      <span style={{ color: "#38bdf8", fontWeight: 700 }}>{modalData.ecn_number || "ECN"}</span>
                      {modalData.rfq_no && (
                        <span style={{ color: "#94a3b8" }}> | Linked RFQ: <span style={{ color: "#34d399", fontWeight: 700 }}>{modalData.rfq_no}</span></span>
                      )}
                    </div>

                    <div className="form-section-title">1. ECN & RFQ Identification</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">RFQ No.</label>
                        <input
                          type="text"
                          placeholder="e.g. RFQ618260001"
                          value={modalData.rfq_no || ""}
                          onChange={e => setModalData({ ...modalData, rfq_no: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Stage</label>
                        <select
                          value={modalData.stage || "sample"}
                          onChange={e => setModalData({ ...modalData, stage: e.target.value })}
                        >
                          {ECN_STAGE_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Customer Name</label>
                        <select
                          value={modalData.customer_name || ""}
                          onChange={e => setModalData({ ...modalData, customer_name: e.target.value })}
                        >
                          <option value="">Select Customer from Customer Master...</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                          ))}
                          {modalData.customer_name && !customers.some(c => c.name === modalData.customer_name) && (
                            <option value={modalData.customer_name}>{modalData.customer_name}</option>
                          )}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Model Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Scorpio-EV"
                          value={modalData.model_name || ""}
                          onChange={e => setModalData({ ...modalData, model_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">No. of ckt (Circuits)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 88 (digits only)"
                          value={modalData.no_of_ckt !== undefined ? modalData.no_of_ckt : ""}
                          onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={e => setModalData({ ...modalData, no_of_ckt: e.target.value.replace(/[^0-9]/g, "") })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Volume</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 15000 (digits only)"
                          value={modalData.volume !== undefined ? modalData.volume : ""}
                          onKeyDown={(e) => {
                            if (!/[0-9]/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
                              e.preventDefault();
                            }
                          }}
                          onChange={e => setModalData({ ...modalData, volume: e.target.value.replace(/[^0-9]/g, "") })}
                        />
                      </div>
                    </div>

                    <div className="form-section-title">2. Timeline & Target Dates</div>
                    <div className="form-row-3">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Start Date
                        </label>
                        <input
                          type="date"
                          value={modalData.work_start_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, work_start_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Target Date
                        </label>
                        <input
                          type="date"
                          value={modalData.target_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, target_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Actual Date
                        </label>
                        <input
                          type="date"
                          value={modalData.completion_date || modalData.actual_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, completion_date: e.target.value, actual_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-section-title">3. Queries & Unique RFQ</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Query Status</label>
                        <select
                          value={modalData.query_status || "Open"}
                          onChange={e => setModalData({ ...modalData, query_status: e.target.value })}
                        >
                          {RFQ_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Unique List Share Date
                        </label>
                        <input
                          type="date"
                          value={modalData.unique_list_share_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, unique_list_share_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Unique RFQ No.</label>
                        <input
                          type="text"
                          placeholder="e.g. RFQ618260001"
                          value={modalData.unique_rfq_no || ""}
                          onChange={e => setModalData({ ...modalData, unique_rfq_no: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Unique Status</label>
                        <select
                          value={modalData.unique_status || "Open"}
                          onChange={e => setModalData({ ...modalData, unique_status: e.target.value })}
                        >
                          {RFQ_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-section-title">4. SAP BOM & Labels</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> SAP BOM Upload Date
                        </label>
                        <input
                          type="date"
                          value={modalData.sap_bom_upload_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, sap_bom_upload_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> SAP BOM Released Date
                        </label>
                        <input
                          type="date"
                          value={modalData.sap_bom_released_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, sap_bom_released_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> PRD BOM Release Date
                        </label>
                        <input
                          type="date"
                          value={modalData.prd_bom_release_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, prd_bom_release_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> Label Upload Date
                        </label>
                        <input
                          type="date"
                          value={modalData.label_upload_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, label_upload_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="form-section-title">5. MIN & Overall Status</div>
                    <div className="form-row-3">
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> MIN by Engineer Date
                        </label>
                        <input
                          type="date"
                          value={modalData.min_by_engineer_date || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, min_by_engineer_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Calendar size={13} style={{ color: "#38bdf8" }} /> MIN by PPC
                        </label>
                        <input
                          type="date"
                          value={modalData.min_by_ppc || ""}
                          onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                          onChange={e => setModalData({ ...modalData, min_by_ppc: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">MIN Status</label>
                        <select
                          value={modalData.min_status || "Open"}
                          onChange={e => setModalData({ ...modalData, min_status: e.target.value })}
                        >
                          {ECN_MIN_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Over all status</label>
                        <select
                          value={modalData.overall_status || modalData.ecn_status || "Open"}
                          onChange={e => setModalData({ ...modalData, overall_status: e.target.value, ecn_status: e.target.value })}
                        >
                          {ECN_OVERALL_STATUS_OPTIONS.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Review</label>
                        <input
                          type="text"
                          placeholder="Review notes..."
                          value={modalData.review || ""}
                          onChange={e => setModalData({ ...modalData, review: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* FORM: UPLOAD BOM */}
                {modalType === "upload_bom" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Linked ECN *</label>
                      <select
                        required
                        value={modalData.ecn_id || ""}
                        onChange={e => setModalData({ ...modalData, ecn_id: e.target.value })}
                      >
                        <option value="">Select ECN...</option>
                        {ecns.map(e => (
                          <option key={e.id} value={e.id}>{e.ecn_number} — {e.harness_number}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">FG Code *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. FG-NXN-MAIN-901"
                          value={modalData.fg_code || ""}
                          onChange={e => setModalData({ ...modalData, fg_code: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">BOM Alternate (Auto: 01, 02...)</label>
                        <input
                          type="text"
                          placeholder="Leave blank for auto-sequence"
                          value={modalData.bom_alternate || ""}
                          onChange={e => setModalData({ ...modalData, bom_alternate: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Customer Part Number *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 28400-NXN-0100"
                          value={modalData.customer_part_number || ""}
                          onChange={e => setModalData({ ...modalData, customer_part_number: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Customer Revision *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. B"
                          value={modalData.customer_revision || ""}
                          onChange={e => setModalData({ ...modalData, customer_revision: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">FG Revision *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. BA"
                          value={modalData.fg_revision || ""}
                          onChange={e => setModalData({ ...modalData, fg_revision: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Uploaded By Engineer *</label>
                        <select
                          required
                          value={modalData.uploaded_by_id || ""}
                          onChange={e => setModalData({ ...modalData, uploaded_by_id: e.target.value })}
                        >
                          <option value="">Select Engineer...</option>
                          {engineers.filter(e => e.is_active).map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* FORM: RELEASE BOM */}
                {modalType === "release_bom" && (
                  <div className="form-group">
                    <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Calendar size={13} style={{ color: "#38bdf8" }} /> SAP Release Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={modalData.release_date || new Date().toISOString().split("T")[0]}
                      onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                      onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                      onChange={e => setModalData({ ...modalData, release_date: e.target.value })}
                    />
                    <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "4px" }}>
                      Releasing the BOM will permit downstream Label Uploads.
                    </div>
                  </div>
                )}

                {/* FORM: UPLOAD LABEL */}
                {modalType === "upload_label" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Uploaded By Engineer *</label>
                      <select
                        required
                        value={modalData.uploaded_by_id || ""}
                        onChange={e => setModalData({ ...modalData, uploaded_by_id: e.target.value })}
                      >
                        <option value="">Select Engineer...</option>
                        {engineers.filter(e => e.is_active).map(e => (
                          <option key={e.id} value={e.id}>{e.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Label Upload Reason *</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="e.g. Initial barcode template release or customer format correction"
                        value={modalData.reason || ""}
                        onChange={e => setModalData({ ...modalData, reason: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* FORM: RECORD MIN */}
                {modalType === "record_min" && (
                  <>
                    <div className="form-group">
                      <label className="form-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Calendar size={13} style={{ color: "#38bdf8" }} /> MIN Meeting Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={modalData.meeting_date || new Date().toISOString().split("T")[0]}
                        onClick={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                        onFocus={e => { try { (e.currentTarget as any).showPicker?.(); } catch { } }}
                        onChange={e => setModalData({ ...modalData, meeting_date: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">MIN Remarks</label>
                      <textarea
                        rows={2}
                        placeholder="MIN meeting approval notes"
                        value={modalData.remarks || ""}
                        onChange={e => setModalData({ ...modalData, remarks: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* FORM: KIT DETAILS */}
                {modalType === "kit_details" && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Master Rack Number</label>
                        <input
                          type="text"
                          placeholder="e.g. RACK-EV-02"
                          value={modalData.rack_number || ""}
                          onChange={e => setModalData({ ...modalData, rack_number: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Master File Number</label>
                        <input
                          type="text"
                          placeholder="e.g. FILE-NXN-88"
                          value={modalData.file_number || ""}
                          onChange={e => setModalData({ ...modalData, file_number: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Hard Copy Archive Location</label>
                      <input
                        type="text"
                        placeholder="e.g. Master Archive Cabinets, Tier 3"
                        value={modalData.hard_copy_location || ""}
                        onChange={e => setModalData({ ...modalData, hard_copy_location: e.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setModalType(null); setModalError(null); }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION POPUP MODAL */}
      {deleteConfirmTarget && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmTarget(null)}>
          <div
            className="modal-container"
            style={{ maxWidth: "420px", border: "1px solid rgba(239, 68, 68, 0.4)", boxShadow: "0 10px 30px rgba(0, 0, 0, 0.8)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ borderBottom: "1px solid rgba(239, 68, 68, 0.2)" }}>
              <div className="modal-title" style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "8px" }}>
                <Trash2 size={18} /> Delete {deleteConfirmTarget.type === "ecn" ? "ECN" : "RFQ"}
              </div>
              <button className="modal-close" onClick={() => setDeleteConfirmTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: "20px" }}>
              <p style={{ fontSize: "14px", color: "#f1f5f9", margin: 0, lineHeight: 1.5 }}>
                Are you sure you want to delete {deleteConfirmTarget.type === "ecn" ? "ECN" : "RFQ"} <span style={{ color: "#38bdf8", fontWeight: 700 }}>{deleteConfirmTarget.targetNum}</span>?
              </p>
            </div>
            <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "14px 20px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  if (deleteConfirmTarget.type === "ecn") {
                    executeDeleteEcn(deleteConfirmTarget.id, deleteConfirmTarget.targetNum);
                  } else {
                    executeDeleteRfq(deleteConfirmTarget.id, deleteConfirmTarget.targetNum);
                  }
                  setDeleteConfirmTarget(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
