/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServerClient";

// POST /api/generated-images/claim
export async function POST(req: NextRequest) {
  try {
    const { session_token, user_id } = await req.json();

    // Input validation
    if (!session_token || typeof session_token !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid session_token." },
        { status: 400 }
      );
    }
    if (!user_id || typeof user_id !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid user_id." },
        { status: 400 }
      );
    }

    // Find guest images with this session_token
    const { data: guestImages, error: fetchError } = await supabaseServer
      .from("generated_images")
      .select("id")
      .eq("session_token", session_token);

    if (fetchError) {
      return NextResponse.json(
        { error: "Failed to fetch guest images.", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!guestImages || guestImages.length === 0) {
      // Nothing to claim—return success anyway (idempotent)
      return NextResponse.json(
        { message: "No guest images found for this session token." },
        { status: 200 }
      );
    }

    // Extract IDs for update
    const ids = guestImages.map((img) => img.id);

    // Update all images to belong to the user and null out session_token
    const { error: updateError } = await supabaseServer
      .from("generated_images")
      .update({ user_id, session_token: null })
      .in("id", ids);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to claim images.", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: `Successfully claimed ${ids.length} images.`,
        claimed_image_ids: ids,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
