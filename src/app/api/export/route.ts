import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { RFQService, ECNService, BOMService, KitService, DashboardService } from "@/lib/services";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // rfq, ecn, bom, kit, project_kit
    const format = searchParams.get("format") || "xlsx"; // xlsx or csv
    const projectId = searchParams.get("project_id");

    let data: any[] = [];
    let filename = "export";

    if (type === "rfq") {
      const rawData = RFQService.list() as any[];
      data = rawData.map((r, idx) => ({
        "Sr .No (unique RFQ No.)": r.rfq_number || (idx + 1),
        "harness part no.": r.harness_number || "",
        "customer revision": r.revision_code || "",
        "fg code": r.fg_code || "",
        "fg rev.": r.fg_rev || "",
        "description": r.description || (r.customer_name ? `${r.customer_name} - ${r.model_name}` : ""),
        "marketing in put received date": r.marketing_input_date || "",
        "design in put received date": r.design_input_date || "",
        "Query sent date": r.query_submitted_date || "",
        "Query resolve date": r.reply_received_date || "",
        "Query type": r.query_type || "",
        "Query status": r.query_status || (r.query_yes_no ? "Open" : "No Query"),
        "Unique list share date": r.unique_list_share_date || "",
        "Unique RFQ No.": r.rfq_number || "",
        "Unique status": r.unique_status || r.overall_rfq_status || "Open",
        "costing BOM prepare date": r.costing_bom_prepare_date || "",
        "Costing BOM shared date": r.costing_bom_submitted_date || "",
        "Costing BOM Status": r.costing_bom_status || (r.costing_bom_submitted_date ? "Submitted" : "Pending"),
        "Remark": r.remark || r.query_remark || r.proposal_remark || "",
        "Over all status": r.overall_rfq_status || "Open",
        "No. of ckt": r.circuit_count ?? 0,
        "Volume": r.volume ?? 0,
        "Start date": r.work_start_date || "",
        "Target Date": r.target_date || "",
        "Actual Date": r.completion_date || "",
      }));
      filename = "RFQ_Tracker";
    } else if (type === "ecn") {
      data = ECNService.list();
      filename = "ECN_Tracker";
    } else if (type === "bom") {
      data = BOMService.list();
      filename = "BOM_Tracker";
    } else if (type === "kit") {
      data = KitService.listConsolidated();
      filename = "Consolidated_Active_Kit_List";
    } else if (type === "project_kit") {
      if (!projectId) throw new Error("project_id required for project kit export.");
      data = DashboardService.getProjectKitData(Number(projectId));
      filename = `Project_Kit_List_Project_${projectId}`;
    } else {
      throw new Error("Invalid export type.");
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, filename);

    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
