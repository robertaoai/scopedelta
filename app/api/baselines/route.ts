import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("baselines")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  if (!body.name?.trim() || !body.scope_text?.trim()) {
    return NextResponse.json({ error: "Name and scope text are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("baselines")
    .insert({ name: body.name.trim(), scope_text: body.scope_text.trim(), version: 1 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
