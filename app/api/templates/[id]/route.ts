/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/templates/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServerClient";

/**
 * GET /api/templates/[id]
 * Fetch a single template variant by variant_id (integer)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const { data: template, error } = await supabaseServer
    .from("templates")
    .select("*")
    .eq("variant_id", id)
    .single();

  if (error || !template) {
    return NextResponse.json(
      { error: "Template not found", details: error?.message },
      { status: 404 }
    );
  }

  return NextResponse.json({ template }, { status: 200 });
}

/**
 * PATCH /api/templates/[id]
 * Update a template variant. Only updates fields present in the request body.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid JSON body", e },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "No data to update." }, { status: 400 });
  }

  // Only allow updating these fields for security
  const allowedFields = [
    "name",
    "size",
    "frame_color",
    "material",
    "orientation",
    "thumbnail_url",
    "base_price",
    "suggested_price",
  ];
  const updates: Record<string, any> = {};
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields provided for update." },
      { status: 400 }
    );
  }

  const { data: template, error } = await supabaseServer
    .from("templates")
    .update(updates)
    .eq("variant_id", id)
    .select()
    .single();

  if (error || !template) {
    return NextResponse.json(
      { error: "Failed to update template", details: error?.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ template }, { status: 200 });
}

/**
 * DELETE /api/templates/[id]
 * Delete a template variant by variant_id.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (isNaN(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("templates")
    .delete()
    .eq("variant_id", id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete template", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
