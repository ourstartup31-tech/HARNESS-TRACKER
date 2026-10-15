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
  Database
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
                <button className="btn" onClick={() => { setModalType("new_rfq"); setModalData({}); }}>
                  <Plus size={16} /> New RFQ
                </button>
              </div>
            </div>

            <div className="card-panel">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Sr .No (unique RFQ No.)</th>
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
                      <th>No. of ckt</th>
                      <th>Volume</th>
                      <th>Start date</th>
                      <th>Target Date</th>
                      <th>Actual Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rfqs.map((r, idx) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, color: "#38bdf8" }}>{r.rfq_number || idx + 1}</td>
                        <td style={{ fontWeight: 600 }}>{r.harness_number || "-"}</td>
                        <td>{r.revision_code || "-"}</td>
                        <td>{r.fg_code || "-"}</td>
                        <td>{r.fg_rev || "-"}</td>
                        <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.description || (r.customer_name ? `${r.customer_name} - ${r.model_name}` : "")}>
                          {r.description || (r.customer_name ? `${r.customer_name} - ${r.model_name}` : "-")}
                        </td>
                        <td>{r.marketing_input_date || "-"}</td>
                        <td>{r.design_input_date || "-"}</td>
                        <td>{r.query_submitted_date || r.query_sent_date || "-"}</td>
                        <td>{r.reply_received_date || r.query_resolve_date || "-"}</td>
                        <td>{r.query_type || "-"}</td>
                        <td>
                          {r.query_yes_no || r.query_status ? (
                            <span className={`badge ${r.query_status === "Resolved" ? "badge-resolved" : "badge-delayed"}`}>
                              {r.query_status || "Open"}
                            </span>
                          ) : (
                            <span style={{ color: "#64748b" }}>No Query</span>
                          )}
                        </td>
                        <td>{r.unique_list_share_date || "-"}</td>
                        <td style={{ fontWeight: 600, color: "#38bdf8" }}>{r.rfq_number || "-"}</td>
                        <td>
                          <span className={`badge ${r.unique_status === "Completed" || r.unique_status === "Approved" ? "badge-completed" : "badge-open"}`}>
                            {r.unique_status || r.overall_rfq_status || "Open"}
                          </span>
                        </td>
                        <td>{r.costing_bom_prepare_date || "-"}</td>
                        <td>
                          {r.costing_bom_submitted_date ? (
                            <span style={{ color: "#34d399" }}>{r.costing_bom_submitted_date}</span>
                          ) : (
                            <span style={{ color: "#f59e0b" }}>Pending</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${r.costing_bom_status === "Approved" || r.costing_bom_status === "Submitted" || r.costing_bom_submitted_date ? "badge-completed" : "badge-in-progress"}`}>
                            {r.costing_bom_status || (r.costing_bom_submitted_date ? "Submitted" : "Pending")}
                          </span>
                        </td>
                        <td style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.remark || r.query_remark || ""}>
                          {r.remark || r.query_remark || "-"}
                        </td>
                        <td>
                          <span className={`badge ${r.overall_rfq_status === "Completed" ? "badge-completed" : "badge-open"}`}>
                            {r.overall_rfq_status || "Open"}
                          </span>
                        </td>
                        <td>{r.circuit_count !== undefined && r.circuit_count !== null ? r.circuit_count : (r.no_of_ckt || "-")}</td>
                        <td>{r.volume !== undefined && r.volume !== null ? Number(r.volume).toLocaleString() : "-"}</td>
                        <td>{r.work_start_date || r.start_date || "-"}</td>
                        <td>{r.target_date || "-"}</td>
                        <td>{r.completion_date || r.actual_date || "-"}</td>
                        <td>
                          <button
                            className="btn btn-outline"
                            style={{ padding: "4px 8px", fontSize: "11px" }}
                            onClick={() => { setModalType("edit_rfq"); setModalData(r); }}
                          >
                            Update
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
                <button className="btn" onClick={() => { setModalType("new_ecn"); setModalData({}); }}>
                  <Plus size={16} /> New ECN
                </button>
              </div>
            </div>

            <div className="card-panel">
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>ECN Number</th>
                      <th>Harness</th>
                      <th>Stage / Dev</th>
                      <th>Primary Engineer</th>
                      <th>Target Date</th>
                      <th>MIN / Completion</th>
                      <th>Planned / Actual (Days)</th>
                      <th>Delay</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ecns.map(e => (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 600, color: "#38bdf8" }}>{e.ecn_number}</td>
                        <td>
                          <div><b>{e.harness_number}</b></div>
                          <div style={{ fontSize: "11px", color: "#64748b" }}>{e.customer_name} · {e.model_name}</div>
                        </td>
                        <td>
                          <span className="badge badge-in-progress">{e.stage_context}</span>{" "}
                          <span className="badge badge-open">{e.development_type}</span>
                        </td>
                        <td>{e.primary_engineer_name}</td>
                        <td>{e.target_date}</td>
                        <td>
                          {e.min_meeting_date ? (
                            <span style={{ color: "#34d399" }}>{e.min_meeting_date}</span>
                          ) : (
                            <span style={{ color: "#f59e0b" }}>Pending MIN</span>
                          )}
                        </td>
                        <td>
                          {e.planned_duration !== null ? `${e.planned_duration}d` : "-"} /{" "}
                          {e.actual_duration !== null ? `${e.actual_duration}d` : "-"}
                        </td>
                        <td>
                          {e.delay_days > 0 ? (
                            <span className="badge badge-delayed">+{e.delay_days}d</span>
                          ) : (
                            <span style={{ color: "#34d399" }}>0d</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${e.ecn_status === "Completed" ? "badge-completed" : "badge-open"}`}>
                            {e.ecn_status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button
                              className="btn btn-outline"
                              style={{ padding: "4px 8px", fontSize: "11px" }}
                              onClick={() => { setModalType("edit_ecn"); setModalData(e); }}
                            >
                              Edit
                            </button>
                            {!e.min_meeting_date && (
                              <button
                                className="btn btn-success"
                                style={{ padding: "4px 8px", fontSize: "11px" }}
                                onClick={() => { setModalType("record_min"); setModalData({ ecn_id: e.id, ecn_number: e.ecn_number }); }}
                              >
                                MIN
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
          <div className="modal-card">
            <div className="modal-header">
              <div className="modal-title">
                {modalType === "new_customer" && "Add New Customer"}
                {modalType === "new_engineer" && "Add New Engineer"}
                {modalType === "new_project" && "Create Customer Model / Project"}
                {modalType === "new_harness" && "Register Globally Unique Harness"}
                {modalType === "new_revision" && "Add Harness Revision"}
                {modalType === "new_rfq" && "Create RFQ"}
                {modalType === "edit_rfq" && `Update RFQ — ${modalData.rfq_number}`}
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

            <form onSubmit={handleModalSubmit}>
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
                    <div className="form-group">
                      <label className="form-label">Harness *</label>
                      <select
                        required
                        value={modalData.harness_id || ""}
                        onChange={e => setModalData({ ...modalData, harness_id: e.target.value, revision_id: "" })}
                      >
                        <option value="">Select Harness...</option>
                        {harnesses.map(h => (
                          <option key={h.id} value={h.id}>{h.harness_number} ({h.customer_name} - {h.model_name})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Revision *</label>
                      <select
                        required
                        value={modalData.revision_id || ""}
                        onChange={e => setModalData({ ...modalData, revision_id: e.target.value })}
                      >
                        <option value="">Select Revision...</option>
                        {revisions
                          .filter(r => !modalData.harness_id || r.harness_id === Number(modalData.harness_id))
                          .map(r => (
                            <option key={r.id} value={r.id}>Rev {r.revision_code} ({r.sop_number})</option>
                          ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">FG Code</label>
                        <input
                          type="text"
                          placeholder="e.g. FG-NXN-MAIN-901"
                          value={modalData.fg_code || ""}
                          onChange={e => setModalData({ ...modalData, fg_code: e.target.value.toUpperCase() })}
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
                        <label className="form-label">Marketing Input Received Date</label>
                        <input
                          type="date"
                          value={modalData.marketing_input_date || ""}
                          onChange={e => setModalData({ ...modalData, marketing_input_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Design Input Received Date</label>
                        <input
                          type="date"
                          value={modalData.design_input_date || ""}
                          onChange={e => setModalData({ ...modalData, design_input_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Start Date</label>
                        <input
                          type="date"
                          value={modalData.work_start_date || ""}
                          onChange={e => setModalData({ ...modalData, work_start_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Target Date</label>
                        <input
                          type="date"
                          value={modalData.target_date || ""}
                          onChange={e => setModalData({ ...modalData, target_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Actual Date</label>
                        <input
                          type="date"
                          value={modalData.completion_date || ""}
                          onChange={e => setModalData({ ...modalData, completion_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Query Sent Date</label>
                        <input
                          type="date"
                          value={modalData.query_submitted_date || ""}
                          onChange={e => setModalData({ ...modalData, query_submitted_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Query Resolve Date</label>
                        <input
                          type="date"
                          value={modalData.reply_received_date || ""}
                          onChange={e => setModalData({ ...modalData, reply_received_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Query Type</label>
                        <input
                          type="text"
                          placeholder="e.g. Technical / Commercial"
                          value={modalData.query_type || ""}
                          onChange={e => setModalData({ ...modalData, query_type: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Query Status</label>
                        <select
                          value={modalData.query_status || "Open"}
                          onChange={e => setModalData({ ...modalData, query_status: e.target.value, query_yes_no: e.target.value !== "Cancelled" })}
                        >
                          <option value="Open">Open (Blocks Costing BOM!)</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Unique List Share Date</label>
                        <input
                          type="date"
                          value={modalData.unique_list_share_date || ""}
                          onChange={e => setModalData({ ...modalData, unique_list_share_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Unique Status</label>
                        <select
                          value={modalData.unique_status || "Open"}
                          onChange={e => setModalData({ ...modalData, unique_status: e.target.value })}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Costing BOM Prepare Date</label>
                        <input
                          type="date"
                          value={modalData.costing_bom_prepare_date || ""}
                          onChange={e => setModalData({ ...modalData, costing_bom_prepare_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Costing BOM Shared Date</label>
                        <input
                          type="date"
                          value={modalData.costing_bom_submitted_date || ""}
                          onChange={e => setModalData({ ...modalData, costing_bom_submitted_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Costing BOM Status</label>
                        <select
                          value={modalData.costing_bom_status || "Pending"}
                          onChange={e => setModalData({ ...modalData, costing_bom_status: e.target.value })}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Draft">Draft</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Approved">Approved</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Remark</label>
                      <input
                        type="text"
                        placeholder="Remark or notes"
                        value={modalData.remark || ""}
                        onChange={e => setModalData({ ...modalData, remark: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Over all status</label>
                      <select
                        value={modalData.overall_rfq_status || "Open"}
                        onChange={e => setModalData({ ...modalData, overall_rfq_status: e.target.value })}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </>
                )}

                {/* FORM: EDIT RFQ */}
                {modalType === "edit_rfq" && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">FG Code</label>
                        <input
                          type="text"
                          placeholder="e.g. FG-NXN-MAIN-901"
                          value={modalData.fg_code || ""}
                          onChange={e => setModalData({ ...modalData, fg_code: e.target.value.toUpperCase() })}
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
                        <label className="form-label">Marketing Input Received Date</label>
                        <input
                          type="date"
                          value={modalData.marketing_input_date || ""}
                          onChange={e => setModalData({ ...modalData, marketing_input_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Design Input Received Date</label>
                        <input
                          type="date"
                          value={modalData.design_input_date || ""}
                          onChange={e => setModalData({ ...modalData, design_input_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Start Date</label>
                        <input
                          type="date"
                          value={modalData.work_start_date || ""}
                          onChange={e => setModalData({ ...modalData, work_start_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Target Date</label>
                        <input
                          type="date"
                          value={modalData.target_date || ""}
                          onChange={e => setModalData({ ...modalData, target_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Actual Date</label>
                        <input
                          type="date"
                          value={modalData.completion_date || ""}
                          onChange={e => setModalData({ ...modalData, completion_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Query Sent Date</label>
                        <input
                          type="date"
                          value={modalData.query_submitted_date || ""}
                          onChange={e => setModalData({ ...modalData, query_submitted_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Query Resolve Date</label>
                        <input
                          type="date"
                          value={modalData.reply_received_date || ""}
                          onChange={e => setModalData({ ...modalData, reply_received_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Query Type</label>
                        <input
                          type="text"
                          placeholder="e.g. Technical / Commercial"
                          value={modalData.query_type || ""}
                          onChange={e => setModalData({ ...modalData, query_type: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Query Status</label>
                        <select
                          value={modalData.query_status || "Open"}
                          onChange={e => setModalData({ ...modalData, query_status: e.target.value, query_yes_no: e.target.value !== "Cancelled" })}
                        >
                          <option value="Open">Open (Blocks Costing BOM!)</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Unique List Share Date</label>
                        <input
                          type="date"
                          value={modalData.unique_list_share_date || ""}
                          onChange={e => setModalData({ ...modalData, unique_list_share_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Unique Status</label>
                        <select
                          value={modalData.unique_status || "Open"}
                          onChange={e => setModalData({ ...modalData, unique_status: e.target.value })}
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Costing BOM Prepare Date</label>
                        <input
                          type="date"
                          value={modalData.costing_bom_prepare_date || ""}
                          onChange={e => setModalData({ ...modalData, costing_bom_prepare_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Costing BOM Shared Date</label>
                        <input
                          type="date"
                          value={modalData.costing_bom_submitted_date || ""}
                          onChange={e => setModalData({ ...modalData, costing_bom_submitted_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Costing BOM Status</label>
                        <select
                          value={modalData.costing_bom_status || "Pending"}
                          onChange={e => setModalData({ ...modalData, costing_bom_status: e.target.value })}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Draft">Draft</option>
                          <option value="Submitted">Submitted</option>
                          <option value="Approved">Approved</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Remark</label>
                      <input
                        type="text"
                        placeholder="Remark or notes"
                        value={modalData.remark || ""}
                        onChange={e => setModalData({ ...modalData, remark: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Over all status</label>
                      <select
                        value={modalData.overall_rfq_status || "Open"}
                        onChange={e => setModalData({ ...modalData, overall_rfq_status: e.target.value })}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Submitted">Submitted</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>
                  </>
                )}

                {/* FORM: NEW ECN */}
                {modalType === "new_ecn" && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Harness *</label>
                      <select
                        required
                        value={modalData.harness_id || ""}
                        onChange={e => setModalData({ ...modalData, harness_id: e.target.value, source_revision_id: "", rfq_id: "" })}
                      >
                        <option value="">Select Harness...</option>
                        {harnesses.map(h => (
                          <option key={h.id} value={h.id}>{h.harness_number} ({h.customer_name} - {h.model_name})</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Source / Current Revision *</label>
                        <select
                          required
                          value={modalData.source_revision_id || ""}
                          onChange={e => setModalData({ ...modalData, source_revision_id: e.target.value })}
                        >
                          <option value="">Select Source Rev...</option>
                          {revisions
                            .filter(r => !modalData.harness_id || r.harness_id === Number(modalData.harness_id))
                            .map(r => (
                              <option key={r.id} value={r.id}>Rev {r.revision_code} ({r.sop_number})</option>
                            ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Revision Impact *</label>
                        <select
                          value={modalData.revision_impact || "Same Revision"}
                          onChange={e => setModalData({ ...modalData, revision_impact: e.target.value })}
                        >
                          <option value="Same Revision">Same Revision</option>
                          <option value="New Revision">New Revision</option>
                        </select>
                      </div>
                    </div>
                    {modalData.revision_impact === "New Revision" && (
                      <div className="form-group">
                        <label className="form-label">New Revision Target *</label>
                        <select
                          required
                          value={modalData.new_revision_id || ""}
                          onChange={e => setModalData({ ...modalData, new_revision_id: e.target.value })}
                        >
                          <option value="">Select resulting revision...</option>
                          {revisions
                            .filter(r => !modalData.harness_id || r.harness_id === Number(modalData.harness_id))
                            .map(r => (
                              <option key={r.id} value={r.id}>Rev {r.revision_code}</option>
                            ))}
                        </select>
                      </div>
                    )}
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Stage / Context *</label>
                        <select
                          value={modalData.stage_context || "Sample"}
                          onChange={e => setModalData({ ...modalData, stage_context: e.target.value })}
                        >
                          <option value="Sample">Sample</option>
                          <option value="Production">Production</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Development Type *</label>
                        <select
                          value={modalData.development_type || "New Development"}
                          onChange={e => setModalData({ ...modalData, development_type: e.target.value })}
                        >
                          <option value="New Development">New Development</option>
                          <option value="Productized">Productized</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Change / Reason (Mandatory) *</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="Detailed engineering change description"
                        value={modalData.change_reason || ""}
                        onChange={e => setModalData({ ...modalData, change_reason: e.target.value })}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Primary Engineer *</label>
                        <select
                          required
                          value={modalData.primary_engineer_id || ""}
                          onChange={e => setModalData({ ...modalData, primary_engineer_id: e.target.value })}
                        >
                          <option value="">Select Primary Engineer...</option>
                          {engineers.filter(e => e.is_active).map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Target Date *</label>
                        <input
                          type="date"
                          required
                          value={modalData.target_date || ""}
                          onChange={e => setModalData({ ...modalData, target_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Costing Required?</label>
                        <select
                          value={modalData.costing_required ? "1" : "0"}
                          onChange={e => setModalData({ ...modalData, costing_required: e.target.value === "1" })}
                        >
                          <option value="0">No</option>
                          <option value="1">Yes (Mandates Linked RFQ)</option>
                        </select>
                      </div>
                      {modalData.costing_required && (
                        <div className="form-group">
                          <label className="form-label">Related RFQ *</label>
                          <select
                            required
                            value={modalData.rfq_id || ""}
                            onChange={e => setModalData({ ...modalData, rfq_id: e.target.value })}
                          >
                            <option value="">Select RFQ...</option>
                            {rfqs
                              .filter(r => !modalData.harness_id || r.harness_id === Number(modalData.harness_id))
                              .map(r => (
                                <option key={r.id} value={r.id}>{r.rfq_number} ({r.overall_rfq_status})</option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* FORM: EDIT ECN */}
                {modalType === "edit_ecn" && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Work Start Date</label>
                        <input
                          type="date"
                          value={modalData.work_start_date || ""}
                          onChange={e => setModalData({ ...modalData, work_start_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Target Date</label>
                        <input
                          type="date"
                          required
                          value={modalData.target_date || ""}
                          onChange={e => setModalData({ ...modalData, target_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Primary Engineer</label>
                        <select
                          value={modalData.primary_engineer_id || ""}
                          onChange={e => setModalData({ ...modalData, primary_engineer_id: e.target.value })}
                        >
                          {engineers.map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                        {modalData.work_start_date && (
                          <div style={{ fontSize: "11px", color: "#f59e0b" }}>Locked after work starts.</div>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">ECN Status</label>
                        <select
                          value={modalData.ecn_status || "In Progress"}
                          onChange={e => setModalData({ ...modalData, ecn_status: e.target.value })}
                        >
                          <option value="Draft">Draft</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Under Review">Under Review</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Delay Reason (Mandatory if MIN &gt; Target)</label>
                      <input
                        type="text"
                        placeholder="Customer drawing revision or tooling delay..."
                        value={modalData.delay_reason || ""}
                        onChange={e => setModalData({ ...modalData, delay_reason: e.target.value })}
                      />
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
                    <label className="form-label">SAP Release Date *</label>
                    <input
                      type="date"
                      required
                      value={modalData.release_date || new Date().toISOString().split("T")[0]}
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
                      <label className="form-label">MIN Meeting Date *</label>
                      <input
                        type="date"
                        required
                        value={modalData.meeting_date || new Date().toISOString().split("T")[0]}
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
    </div>
  );
}
