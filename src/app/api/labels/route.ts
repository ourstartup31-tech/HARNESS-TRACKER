import { NextResponse } from "next/server";
import { LabelService } from "@/lib/services";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bomId = searchParams.get("bom_id");
    const data = LabelService.list(bomId ? Number(bomId) : undefined);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const label = LabelService.upload({
      bom_id: Number(body.bom_id),
      uploaded_by_id: Number(body.uploaded_by_id),
      reason: body.reason,
      upload_date: body.upload_date
    });
    return NextResponse.json({ success: true, data: label }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
