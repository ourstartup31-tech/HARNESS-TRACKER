import { NextResponse } from "next/server";
import { KitService } from "@/lib/services";

export async function GET() {
  try {
    const data = KitService.listConsolidated();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const kit = KitService.createOrUpdate({
      ecn_id: Number(body.ecn_id),
      rack_number: body.rack_number,
      file_number: body.file_number,
      hard_copy_location: body.hard_copy_location,
      status: body.status || "Active"
    });
    return NextResponse.json({ success: true, data: kit }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
