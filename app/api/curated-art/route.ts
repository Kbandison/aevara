import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServerClient";

// GET: List curated art
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const tag = searchParams.get("tag");
  const title = searchParams.get("title");
  const page = Number(searchParams.get("page") || 1);
  const pageSize = Number(searchParams.get("page_size") || 20);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Use the client directly, not as a function!
  let query = supabaseServer.from("curated_art").select("*");

  if (tag) query = query.contains("tags", [tag]);
  if (title) query = query.ilike("title", `%${title}%`);

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch art", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ curated: data }, { status: 200 });
}

// POST: Add curated art
export async function POST(req: NextRequest) {
  try {
    const {
      slug,
      title,
      description,
      image_url,
      sizes,
      price,
      tags,
      created_by,
    } = await req.json();

    if (!slug || !title || !image_url || !sizes || !price) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Use the client directly, not as a function!
    const { data, error } = await supabaseServer
      .from("curated_art")
      .insert([
        { slug, title, description, image_url, sizes, price, tags, created_by },
      ])
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Failed to add art", details: error?.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ art: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}
