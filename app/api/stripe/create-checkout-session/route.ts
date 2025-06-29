/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/stripe/create-checkout-session/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServerClient";

// Stripe secret key from env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil", // Update to latest Stripe version
});

export async function POST(req: NextRequest) {
  try {
    const { user_id, items, currency = "USD" } = await req.json();

    if (!user_id || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Calculate total price from items
    const total_price = items.reduce(
      (sum: number, item: any) => sum + item.price * (item.quantity ?? 1),
      0
    );

    // Create order in Supabase (status 'pending')
    const { data: order, error: orderError } = await supabaseServer
      .from("orders")
      .insert([{ user_id, total_price, status: "pending", currency }])
      .select()
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Failed to create order", details: orderError?.message },
        { status: 500 }
      );
    }

    // Insert order_items into Supabase
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
      // Optionally, rollback the order here!
      return NextResponse.json(
        { error: "Failed to add order items", details: itemsError.message },
        { status: 500 }
      );
    }

    // Format Stripe line items
    const stripeLineItems = items.map((item: any) => ({
      price_data: {
        currency,
        product_data: {
          name: item.title,
          images: item.image_url ? [item.image_url] : [],
        },
        unit_amount: Math.round(item.price * 100), // in cents!
      },
      quantity: item.quantity ?? 1,
    }));

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: stripeLineItems,
      mode: "payment",
      client_reference_id: order.id, // for webhook association
      success_url: process.env.NEXT_PUBLIC_CHECKOUT_SUCCESS_URL!,
      cancel_url: process.env.NEXT_PUBLIC_CHECKOUT_CANCEL_URL!,
      metadata: {
        user_id,
        order_id: order.id,
      },
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err.message || String(err) },
      { status: 500 }
    );
  }
}
