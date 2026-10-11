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
      harness_id: Number(body.harness_id),
      source_revision_id: Number(body.source_revision_id),
      stage_context: body.stage_context,
      development_type: body.development_type,
      change_reason: body.change_reason,
      primary_engineer_id: Number(body.primary_engineer_id),
      target_date: body.target_date,
      revision_impact: body.revision_impact,
      new_revision_id: body.new_revision_id ? Number(body.new_revision_id) : null,
      costing_required: Boolean(body.costing_required),
      rfq_id: body.rfq_id ? Number(body.rfq_id) : null,
      support_engineer_id: body.support_engineer_id ? Number(body.support_engineer_id) : null,
      design_input_date: body.design_input_date,
      work_start_date: body.work_start_date,
      min_meeting_date: body.min_meeting_date,
      ecn_status: body.ecn_status,
      delay_reason: body.delay_reason
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
