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
        "Sr .No (unique RFQ No.)": r.sr_no || r.rfq_number || (idx + 1),
        "Customer Name": r.customer_name || "",
        "Model": r.model || r.model_name || "",
        "Drawing Number": r.drawing_number || "",
        "harness part no.": r.harness_part_no || r.harness_number || "",
        "customer revision": r.customer_revision || r.revision_code || "",
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
        "Unique RFQ No.": r.unique_rfq_no || r.rfq_number || "",
        "Unique status": r.unique_status || r.overall_rfq_status || "Open",
        "costing BOM prepare date": r.costing_bom_prepare_date || "",
        "Costing BOM shared date": r.costing_bom_submitted_date || "",
        "Costing BOM Status": r.costing_bom_status || (r.costing_bom_submitted_date ? "Submitted" : "Pending"),
        "Remark": r.remark || r.query_remark || r.proposal_remark || "",
        "Over all status": r.overall_rfq_status || "Open",
        "Name": r.engineer_name || "",
        "No. of ckt": r.no_of_ckt ?? r.circuit_count ?? 0,
        "Volume": r.volume ?? 0,
        "Start date": r.work_start_date || "",
        "Target Date": r.target_date || "",
        "Actual Date": r.completion_date || "",
        "Review Note": r.review_note || "",
      }));
      filename = "RFQ_Tracker";
    } else if (type === "ecn") {
      const rawData = ECNService.list() as any[];
      data = rawData.map((e, idx) => ({
        "ecn no.": e.ecn_number || (idx + 1),
        "rfq no.": e.rfq_no || e.related_rfq_number || "",
        "stage": e.stage || "sample",
        "customer name": e.customer_name || "",
        "model name": e.model_name || "",
        "Query status": e.query_status || "Open",
        "Unique list share date": e.unique_list_share_date || "",
        "Unique RFQ No.": e.unique_rfq_no || "",
        "Unique status": e.unique_status || "Open",
        "sap bom upload date": e.sap_bom_upload_date || "",
        "sap bom released date": e.sap_bom_released_date || "",
        "prd bom release date": e.prd_bom_release_date || "",
        "label upload date": e.label_upload_date || "",
        "min by engineer date": e.min_by_engineer_date || "",
        "min by ppc": e.min_by_ppc || "",
        "min status": e.min_status || "Open",
        "review": e.review || "",
        "Over all status": e.overall_status || e.ecn_status || "Open",
        "No. of ckt": e.no_of_ckt ?? 0,
        "Volume": e.volume ?? 0,
        "Start date": e.work_start_date || "",
        "Target Date": e.target_date || "",
        "Actual Date": e.completion_date || e.actual_date || "",
      }));
      filename = "ECN_Tracker";
    } else if (type === "bom") {
      data = BOMService.list();
      filename = "BOM_Tracker";
    } else if (type === "kit") {
      data = KitService.listConsolidated();
      filename = "Consolidated_Active_Kit_List";
    } else if (type === "project_kit") {
      const customer = searchParams.get("customer");
      data = DashboardService.getProjectKitData(
        projectId ? Number(projectId) : undefined,
        customer || undefined
      );
      filename = customer
        ? `Project_Kit_Customer_${customer.replace(/[^a-zA-Z0-9_-]/g, "_")}`
        : (projectId ? `Project_Kit_Project_${projectId}` : `Project_Kit_All_Customers`);
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
