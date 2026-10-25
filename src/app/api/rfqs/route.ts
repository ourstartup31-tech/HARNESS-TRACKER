import { NextResponse } from "next/server";
import { RFQService } from "@/lib/services";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("action") === "next_number") {
      const nextNum = RFQService.generateNextNumber();
      return NextResponse.json({ success: true, next_rfq_number: nextNum });
    }
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
      customer_name: body.customer_name,
      sr_no: body.sr_no,
      rfq_number: body.rfq_number,
      unique_rfq_no: body.unique_rfq_no,
      drawing_number: body.drawing_number,
      model: body.model,
      engineer_id: body.engineer_id ? Number(body.engineer_id) : undefined,
      engineer_name: body.engineer_name,
      harness_part_no: body.harness_part_no || body.harness_number,
      customer_revision: body.customer_revision || body.revision_code,
      harness_id: body.harness_id ? Number(body.harness_id) : undefined,
      revision_id: body.revision_id ? Number(body.revision_id) : undefined,
      fg_code: body.fg_code,
      fg_rev: body.fg_rev,
      description: body.description,
      no_of_ckt: body.no_of_ckt !== undefined && body.no_of_ckt !== "" ? body.no_of_ckt : (body.circuit_count !== undefined && body.circuit_count !== "" ? body.circuit_count : undefined),
      volume: body.volume !== undefined && body.volume !== "" ? body.volume : undefined,
      marketing_input_date: body.marketing_input_date,
      design_input_date: body.design_input_date,
      work_start_date: body.work_start_date || body.start_date,
      target_date: body.target_date,
      completion_date: body.completion_date || body.actual_date,
      costing_bom_prepare_date: body.costing_bom_prepare_date,
      costing_bom_submitted_date: body.costing_bom_submitted_date || body.costing_bom_shared_date,
      costing_bom_status: body.costing_bom_status,
      query_yes_no: Boolean(body.query_yes_no),
      query_submitted_date: body.query_submitted_date || body.query_sent_date,
      reply_received_date: body.reply_received_date || body.query_resolve_date,
      query_type: body.query_type,
      query_status: body.query_status,
      query_remark: body.query_remark || body.remark,
      unique_list_share_date: body.unique_list_share_date,
      unique_status: body.unique_status,
      proposal_yes_no: Boolean(body.proposal_yes_no),
      proposal_submitted_date: body.proposal_submitted_date,
      proposal_status: body.proposal_status,
      proposal_remark: body.proposal_remark,
      remark: body.remark,
      review_note: body.review_note,
      overall_rfq_status: body.overall_rfq_status || body.overall_status,
      create_ecn: Boolean(body.create_ecn)
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const action = searchParams.get("action");
    if (!id) throw new Error("ID required.");
    if (action === "restore") {
      const rfq = RFQService.restore(Number(id));
      return NextResponse.json({ success: true, data: rfq });
    }
    const rfq = RFQService.softDelete(Number(id));
    return NextResponse.json({ success: true, data: rfq });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
