"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Baselines ──────────────────────────────────────────────────────────────

export async function getBaselines() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("baselines")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getBaseline(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("baselines")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function createBaseline(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const scope_text = formData.get("scope_text") as string;

  if (!name?.trim() || !scope_text?.trim()) {
    throw new Error("Name and scope text are required");
  }

  const { data, error } = await supabase
    .from("baselines")
    .insert({ name: name.trim(), scope_text: scope_text.trim(), version: 1 })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function updateBaseline(id: string, formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const scope_text = formData.get("scope_text") as string;

  if (!name?.trim() || !scope_text?.trim()) {
    throw new Error("Name and scope text are required");
  }

  const { data, error } = await supabase
    .from("baselines")
    .update({ name: name.trim(), scope_text: scope_text.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function deleteBaseline(id: string) {
  const supabase = await createClient();

  // Delete associated change requests first
  await supabase.from("change_requests").delete().eq("baseline_id", id);

  const { error } = await supabase.from("baselines").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ─── Change Requests ────────────────────────────────────────────────────────

export async function getChangeRequests(baselineId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("change_requests")
    .select("*")
    .eq("baseline_id", baselineId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function createChangeRequest(formData: FormData) {
  const supabase = await createClient();
  const baseline_id = formData.get("baseline_id") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  if (!baseline_id || !title?.trim() || !description?.trim()) {
    throw new Error("Baseline, title, and description are required");
  }

  const { data, error } = await supabase
    .from("change_requests")
    .insert({
      baseline_id,
      title: title.trim(),
      description: description.trim(),
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function updateChangeRequestStatus(id: string, status: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("change_requests")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function updateChangeRequestDraft(
  id: string,
  draft_document: string,
  draft_document_source: string,
  draft_document_confidence: number,
  draft_document_review_status: string,
  status: string
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("change_requests")
    .update({
      draft_document,
      draft_document_source,
      draft_document_confidence,
      draft_document_review_status,
      status,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

export async function deleteChangeRequest(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("change_requests")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}
