/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/orders/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServerClient";

// GET: Get single order (with order items)
export async function GET(req: NextRequest, { params }: any) {
  const orderId = params.id;

  if (!orderId) {
    return NextResponse.json({ error: "Missing order id." }, { status: 400 });
  }

  try {
    const { data: order, error } = await supabaseServer
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Order not found", details: error?.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err.message || String(err) },
      { status: 500 }
    );
  }
}

// PATCH: Update order (status/payment)
export async function PATCH(req: NextRequest, { params }: any) {
  const orderId = params.id;
  if (!orderId) {
    return NextResponse.json({ error: "Missing order id." }, { status: 400 });
  }

  const allowedStatus = [
    "pending",
    "processing",
    "fulfilled",
    "cancelled",
    "refunded",
    "failed",
    // add more if you use granular status states
  ];

  const body = await req.json();
  const updates: { [k: string]: any } = {};

  if ("status" in body) {
    if (!allowedStatus.includes(body.status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${allowedStatus.join(", ")}`,
        },
        { status: 400 }
      );
    }
    updates.status = body.status;
  }
  if ("stripe_payment_id" in body) {
    updates.stripe_payment_id = body.stripe_payment_id;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update." },
      { status: 400 }
    );
  }

  try {
    const { data: order, error } = await supabaseServer
      .from("orders")
      .update(updates)
      .eq("id", orderId)
      .select("*, order_items(*)")
      .single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Failed to update order", details: error?.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err.message || String(err) },
      { status: 500 }
    );
  }
}
