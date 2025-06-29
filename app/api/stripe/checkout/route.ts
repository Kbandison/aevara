/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/stripe/checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServerClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

export async function POST(req: NextRequest) {
  try {
    const { order_id } = await req.json();

    // 1. Fetch order and items
    const { data: order, error: orderError } = await supabaseServer
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found", details: orderError?.message },
        { status: 404 }
      );
    }

    // 2. Build Stripe line_items
    const line_items = order.order_items.map((item: any) => ({
      price_data: {
        currency: order.currency || "USD",
        product_data: {
          name: item.title,
          images: item.image_url ? [item.image_url] : [],
        },
        unit_amount: Math.round(Number(item.price) * 100), // Stripe expects cents (integer)
      },
      quantity: item.quantity ?? 1,
    }));

    // 3. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      // Optionally collect email, only if present
      ...(order.email ? { customer_email: order.email } : {}),
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?order_id=${order_id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/cancel?order_id=${order_id}`,
      metadata: { order_id: order_id },
    });

    // 4. Optionally store session id in order (for tracking)
    await supabaseServer
      .from("orders")
      .update({ stripe_payment_id: session.id })
      .eq("id", order_id);

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    // Provide detailed error in dev
    return NextResponse.json(
      {
        error: err.message || "Failed to create Stripe checkout session",
        details: err.stack,
      },
      { status: 500 }
    );
  }
}
