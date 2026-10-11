import { NextResponse } from "next/server";
import { DashboardService } from "@/lib/services";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const mode = searchParams.get("mode");

    if (mode === "project_kit") {
      if (!projectId) throw new Error("project_id required for project kit data.");
      const kitData = DashboardService.getProjectKitData(Number(projectId));
      return NextResponse.json({ success: true, data: kitData });
    }

    const data = DashboardService.getProjectMetrics(projectId ? Number(projectId) : undefined);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
