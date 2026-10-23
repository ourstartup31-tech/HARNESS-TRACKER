import { NextResponse } from "next/server";
import { ECNService } from "@/lib/services";

export async function GET() {
  try {
    const data = ECNService.list();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ecn = ECNService.create({
      ...body,
      harness_id: body.harness_id ? Number(body.harness_id) : null,
      source_revision_id: body.source_revision_id ? Number(body.source_revision_id) : null,
      primary_engineer_id: body.primary_engineer_id ? Number(body.primary_engineer_id) : null,
      support_engineer_id: body.support_engineer_id ? Number(body.support_engineer_id) : null,
      new_revision_id: body.new_revision_id ? Number(body.new_revision_id) : null,
      costing_required: Boolean(body.costing_required),
      rfq_id: body.rfq_id ? Number(body.rfq_id) : null
    });
    return NextResponse.json({ success: true, data: ecn }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const ecn = ECNService.update(Number(body.id), body);
    return NextResponse.json({ success: true, data: ecn });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) throw new Error("ID required for delete.");
    const ecn = ECNService.softDelete(Number(id));
    return NextResponse.json({ success: true, data: ecn });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
