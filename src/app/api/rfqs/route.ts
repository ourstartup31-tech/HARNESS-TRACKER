import { NextResponse } from "next/server";
import { RFQService } from "@/lib/services";

export async function GET() {
  try {
    const data = RFQService.list();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rfq = RFQService.create({
      harness_id: Number(body.harness_id),
      revision_id: Number(body.revision_id),
      marketing_input_date: body.marketing_input_date,
      design_input_date: body.design_input_date,
      work_start_date: body.work_start_date,
      target_date: body.target_date,
      completion_date: body.completion_date,
      costing_bom_submitted_date: body.costing_bom_submitted_date,
      query_yes_no: Boolean(body.query_yes_no),
      query_submitted_date: body.query_submitted_date,
      reply_received_date: body.reply_received_date,
      query_status: body.query_status,
      query_remark: body.query_remark,
      proposal_yes_no: Boolean(body.proposal_yes_no),
      proposal_submitted_date: body.proposal_submitted_date,
      proposal_status: body.proposal_status,
      proposal_remark: body.proposal_remark,
      overall_rfq_status: body.overall_rfq_status
    });
    return NextResponse.json({ success: true, data: rfq }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const rfq = RFQService.update(Number(body.id), body);
    return NextResponse.json({ success: true, data: rfq });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
