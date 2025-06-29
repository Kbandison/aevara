/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServerClient";

// Helper to get user_id if using Supabase Auth (optional)
async function getUserId(_req: NextRequest): Promise<string | null> {
  // Example: If you pass a supabase session/access token in headers/cookies
  // For MVP, just return null (guest), update later if needed!
  return null;
}

// POST: Create a generated image (guest or user)
export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      style_preset,
      image_url,
      session_token, // Required for guests!
    } = await req.json();

    // Get user_id if authenticated (for now, guests only)
    const user_id = await getUserId(req);

    // --- Basic Validation ---
    if (!prompt || !image_url || (!session_token && !user_id)) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // --- Prepare insert object ---
    const insertData: any = {
      prompt,
      style_preset: style_preset ?? null,
      image_url,
      session_token: session_token ?? null,
      user_id: user_id ?? null,
    };

    // --- Insert into Supabase ---
    const { data, error } = await supabaseServer
      .from("generated_images")
      .insert([insertData])
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to save image", details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ generated_image: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}

// GET: List generated images (for user or guest session)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const session_token = searchParams.get("session_token");
  const user_id = searchParams.get("user_id"); // Use this for authenticated users
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("page_size") || 20);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseServer.from("generated_images").select("*");

  if (user_id) {
    query = query.eq("user_id", user_id);
  } else if (session_token) {
    query = query.eq("session_token", session_token);
  } else {
    // No filter—return nothing for privacy
    return NextResponse.json({ images: [] }, { status: 200 });
  }

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch images", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ images: data }, { status: 200 });
}
