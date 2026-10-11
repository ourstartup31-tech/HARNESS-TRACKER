import { NextResponse } from "next/server";
import { MINService } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const minMeeting = MINService.record({
      ecn_id: Number(body.ecn_id),
      meeting_date: body.meeting_date,
      remarks: body.remarks
    });
    return NextResponse.json({ success: true, data: minMeeting }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
