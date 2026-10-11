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
      data = RFQService.list();
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
