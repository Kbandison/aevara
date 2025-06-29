/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServerClient";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

// Raw body for Stripe signature check
export const config = {
  api: { bodyParser: false },
};

// Helper to read raw buffer from the request
async function getRawBody(req: Request): Promise<Buffer> {
  const reader = req.body?.getReader();
  let result = new Uint8Array();
  if (reader) {
    let done = false;
    while (!done) {
      const { value, done: readDone } = await reader.read();
      if (value) {
        const tmp = new Uint8Array(result.length + value.length);
        tmp.set(result, 0);
        tmp.set(value, result.length);
        result = tmp;
      }
      done = readDone;
    }
  }
  return Buffer.from(result);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    const buf = await getRawBody(req as any);
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Webhook signature verification failed", details: err.message },
      { status: 400 }
    );
  }

  // -- Main Stripe event switch --
  try {
    // Payment success (Checkout session)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const order_id = session.metadata?.order_id;
      if (order_id) {
        // Mark order as paid, store Stripe payment intent/session id
        const { error } = await supabaseServer
          .from("orders")
          .update({
            status: "paid",
            stripe_payment_id: session.payment_intent || session.id,
          })
          .eq("id", order_id);
        if (error) {
          return NextResponse.json(
            { error: "Failed to update order", details: error.message },
            { status: 500 }
          );
        }
      }
    }

    // Payment failed (payment_intent)
    else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const stripe_payment_id = paymentIntent.id;
      // Optionally, look up order by payment_intent
      await supabaseServer
        .from("orders")
        .update({ status: "payment_failed" })
        .eq("stripe_payment_id", stripe_payment_id);
    }

    // Payment succeeded (catch all)
    else if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const stripe_payment_id = paymentIntent.id;
      await supabaseServer
        .from("orders")
        .update({ status: "paid" })
        .eq("stripe_payment_id", stripe_payment_id);
    }

    // Refund (full or partial)
    else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const stripe_payment_id = charge.payment_intent || charge.id;
      const amount_refunded = charge.amount_refunded / 100; // cents → dollars
      const total_amount = charge.amount / 100;
      const refund_id = charge.refunds?.data?.[0]?.id || null;

      await supabaseServer
        .from("orders")
        .update({
          status:
            amount_refunded === total_amount
              ? "refunded"
              : "partially_refunded",
          refund_amount: amount_refunded,
          refund_id,
        })
        .eq("stripe_payment_id", stripe_payment_id);
    }

    // Optionally: handle more Stripe events here
  } catch (err: any) {
    return NextResponse.json(
      { error: "Order update error", details: err.message },
      { status: 500 }
    );
  }

  // Always respond quickly
  return new Response("Webhook received", { status: 200 });
}
