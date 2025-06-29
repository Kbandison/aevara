// app/api/order-items/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServerClient";

// GET: List order items, support filter/search
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const order_id = searchParams.get("order_id");
  const type = searchParams.get("type");
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("page_size") || 20);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseServer.from("order_items").select("*");

  if (order_id) query = query.eq("order_id", order_id);
  if (type) query = query.eq("type", type);

  query = query.order("id", { ascending: false }).range(from, to);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch order items", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ order_items: data }, { status: 200 });
}

// POST: Add a new order item (usually admin only)
export async function POST(req: NextRequest) {
  try {
    const {
      order_id,
      type,
      title,
      image_url,
      template_id,
      size,
      frame,
      quantity,
      price,
    } = await req.json();

    if (!order_id || !type || !title || !image_url || !size || !price) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from("order_items")
      .insert([
        {
          order_id,
          type,
          title,
          image_url,
          template_id,
          size,
          frame,
          quantity: quantity ?? 1,
          price,
        },
      ])
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to add order item", details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ order_item: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
