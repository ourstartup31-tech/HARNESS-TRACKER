import { NextResponse } from "next/server";
import { BOMService } from "@/lib/services";

export async function GET() {
  try {
    const data = BOMService.list();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bom = BOMService.upload({
      ecn_id: Number(body.ecn_id),
      fg_code: body.fg_code,
      customer_part_number: body.customer_part_number,
      customer_revision: body.customer_revision,
      fg_revision: body.fg_revision,
      uploaded_by_id: Number(body.uploaded_by_id),
      bom_alternate: body.bom_alternate,
      upload_date: body.upload_date,
      release_date: body.release_date
    });
    return NextResponse.json({ success: true, data: bom }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const bom = BOMService.release(Number(body.id), body.release_date);
    return NextResponse.json({ success: true, data: bom });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
