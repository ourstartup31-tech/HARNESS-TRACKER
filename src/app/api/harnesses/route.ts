import { NextResponse } from "next/server";
import { HarnessService } from "@/lib/services";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id");
    const data = HarnessService.list(projectId ? Number(projectId) : undefined);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const harness = HarnessService.create(Number(body.project_id), body.harness_number);
    return NextResponse.json({ success: true, data: harness }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
