import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return NextResponse.json({ id: context.params.id, deleted: true });
}
