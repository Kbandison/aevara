import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServerClient";

// Allowed sort fields for safety
const ALLOWED_SORTS = new Set([
  "name",
  "size",
  "material",
  "frame_color",
  "base_price",
  "suggested_price",
]);

function parseCsvParam(param?: string | null): string[] | undefined {
  if (!param) return undefined;
  return param
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Multi-value filters
  const materials = parseCsvParam(searchParams.get("material"));
  const sizes = parseCsvParam(searchParams.get("size"));
  const frame_colors = parseCsvParam(searchParams.get("frame_color"));

  // Partial search for name (single value)
  const name = searchParams.get("name");

  // Pagination
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const pageSize = Math.max(Number(searchParams.get("page_size") || 20), 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Sorting
  let sortBy = searchParams.get("sort_by") || "name";
  let order = (searchParams.get("order") || "asc").toLowerCase();
  if (!ALLOWED_SORTS.has(sortBy)) sortBy = "name";
  if (!["asc", "desc"].includes(order)) order = "asc";

  try {
    let query = supabaseServer.from("templates").select("*");

    if (materials && materials.length > 0)
      query = query.in("material", materials);
    if (sizes && sizes.length > 0) query = query.in("size", sizes);
    if (frame_colors && frame_colors.length > 0)
      query = query.in("frame_color", frame_colors);

    if (name) query = query.ilike("name", `%${name}%`);

    query = query.order(sortBy, { ascending: order === "asc" }).range(from, to);

    const { data: templates, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch templates", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
