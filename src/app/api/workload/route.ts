import { NextResponse } from "next/server";
import { DashboardService } from "@/lib/services";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const engineerId = searchParams.get("engineer_id");
    const data = DashboardService.getEngineerWorkload(engineerId ? Number(engineerId) : undefined);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
