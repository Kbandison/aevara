/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServerClient";

/**
 * Allowed order types
 */
const ALLOWED_TYPES = ["generated", "curated"];
const ALLOWED_CURRENCIES = ["USD"]; // Add more if you support them

// POST: Create a new order with items, robust/atomic pattern
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      user_id,
      type,
      items,
      total_price,
      currency = "USD",
      printful_order_id, // (optional)
      stripe_payment_id, // (optional)
    } = body;

    // Input validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required 'items' array." },
        { status: 400 }
      );
    }
    if (type && !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        {
          error: `Invalid order type. Must be one of: ${ALLOWED_TYPES.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }
    if (!ALLOWED_CURRENCIES.includes(currency)) {
      return NextResponse.json(
        {
          error: `Invalid currency. Supported: ${ALLOWED_CURRENCIES.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }
    if (!total_price || isNaN(Number(total_price))) {
      return NextResponse.json(
        { error: "Missing or invalid total_price." },
        { status: 400 }
      );
    }

    // Create the order
    const { data: order, error: orderError } = await supabaseServer
      .from("orders")
      .insert([
        {
          user_id,
          type,
          total_price,
          currency,
          printful_order_id,
          stripe_payment_id,
        },
      ])
      .select()
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Failed to create order.", details: orderError?.message },
        { status: 500 }
      );
    }

    // Prepare and insert order items
    const orderItems = items.map((item: any) => ({
      order_id: order.id,
      type: item.type,
      title: item.title,
      image_url: item.image_url,
      template_id: item.template_id,
      size: item.size,
      frame: item.frame,
      quantity: item.quantity ?? 1,
      price: item.price,
    }));

    const { error: itemsError } = await supabaseServer
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      // Rollback orphan order for atomicity
      await supabaseServer.from("orders").delete().eq("id", order.id);
      return NextResponse.json(
        {
          error: "Failed to add order items. Order rolled back.",
          details: itemsError.message,
        },
        { status: 500 }
      );
    }

    // Fetch and return the full order with items for confirmation
    const { data: fullOrder, error: fetchError } = await supabaseServer
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order.id)
      .single();

    if (fetchError || !fullOrder) {
      return NextResponse.json(
        {
          error: "Order created but failed to fetch order with items.",
          details: fetchError?.message,
        },
        { status: 201 }
      );
    }

    return NextResponse.json({ order: fullOrder }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err.message || String(err) },
      { status: 500 }
    );
  }
}

// GET: List all orders for the authenticated user, with pagination
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("user_id");
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("page_size") || 10);

  if (!user_id) {
    return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    // Get orders for user, including items for convenience
    const { data: orders, error } = await supabaseServer
      .from("orders")
      .select("*, order_items(*)")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch orders", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ orders }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err.message || String(err) },
      { status: 500 }
    );
  }
}
