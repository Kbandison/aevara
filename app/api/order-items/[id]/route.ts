// app/api/order-items/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServerClient";

// PATCH: Update order item by id
export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const body = await req.json();

  try {
    const { data, error } = await supabaseServer
      .from("order_items")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to update order item", details: error?.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ order_item: data }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}

// DELETE: Delete order item by id (admin only)
// app/api/order-items/[id]/route.ts

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  // Dummy implementation
  return NextResponse.json(
    { id: context.params.id, deleted: true },
    { status: 200 }
  );
}
