import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const baselineId = request.nextUrl.searchParams.get("baseline_id");

  let query = supabase
    .from("change_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (baselineId) {
    query = query.eq("baseline_id", baselineId);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  if (!body.baseline_id || !body.title?.trim() || !body.description?.trim()) {
    return NextResponse.json(
      { error: "baseline_id, title, and description are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("change_requests")
    .insert({
      baseline_id: body.baseline_id,
      title: body.title.trim(),
      description: body.description.trim(),
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
