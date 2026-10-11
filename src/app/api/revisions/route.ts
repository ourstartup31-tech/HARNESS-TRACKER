import { NextResponse } from "next/server";
import { RevisionService } from "@/lib/services";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const harnessId = searchParams.get("harness_id");
    const data = RevisionService.list(harnessId ? Number(harnessId) : undefined);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const revision = RevisionService.create({
      harness_id: Number(body.harness_id),
      revision_code: body.revision_code,
      sop_number: body.sop_number,
      volume: Number(body.volume || 0),
      circuit_count: Number(body.circuit_count || 0),
      status: body.status || "Active"
    });
    return NextResponse.json({ success: true, data: revision }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const revision = RevisionService.setStatus(Number(body.id), body.status);
    return NextResponse.json({ success: true, data: revision });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
