import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.draft_document !== undefined) updates.draft_document = body.draft_document;
  if (body.draft_document_source !== undefined) updates.draft_document_source = body.draft_document_source;
  if (body.draft_document_confidence !== undefined) updates.draft_document_confidence = body.draft_document_confidence;
  if (body.draft_document_review_status !== undefined) updates.draft_document_review_status = body.draft_document_review_status;

  const { data, error } = await supabase
    .from("change_requests")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("change_requests")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
