"use client";

import { useState, useTransition } from "react";

interface ChangeRequestFormProps {
  baselineId: string;
  baselineScopeText: string;
  onCreated: () => void;
}

export function ChangeRequestForm({
  baselineId,
  baselineScopeText,
  onCreated,
}: ChangeRequestFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    startTransition(async () => {
      try {
        // Step 1: Create the change request
        const createRes = await fetch("/api/change-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseline_id: baselineId,
            title,
            description,
          }),
        });

        if (!createRes.ok) {
          const data = await createRes.json();
          throw new Error(data.error || "Failed to create change request");
        }

        const changeRequest = await createRes.json();

        // Step 2: Run analysis
        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            baseline_scope_text: baselineScopeText,
            request_title: title,
            request_description: description,
          }),
        });

        if (analyzeRes.ok) {
          const analysis = await analyzeRes.json();

          // Step 3: Update the change request with analysis results
          await fetch(`/api/change-requests/${changeRequest.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              draft_document: analysis.change_request_document || analysis.summary,
              draft_document_source: analysis.source,
              draft_document_confidence: analysis.confidence,
              draft_document_review_status: "unreviewed",
              status: "reviewed",
            }),
          });
        }

        form.reset();
        setOpen(false);
        onCreated();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  if (!open) {
    return (
      <button
        id="new-change-request-btn"
        onClick={() => setOpen(true)}
        className="btn-primary btn-sm"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Submit Change Request
      </button>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="modal-content p-6">
        <h2 className="text-lg font-semibold mb-1 gradient-text">
          Submit Change Request
        </h2>
        <p className="text-sm text-surface-500 mb-4">
          Describe the incoming feature request. ScopeDelta will analyze it against the baseline.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cr-title" className="block text-sm font-medium text-surface-400 mb-1.5">
              Request Title
            </label>
            <input
              id="cr-title"
              name="title"
              type="text"
              required
              className="input-field"
              placeholder="e.g., Add user authentication"
            />
          </div>
          <div>
            <label htmlFor="cr-description" className="block text-sm font-medium text-surface-400 mb-1.5">
              Request Description
            </label>
            <textarea
              id="cr-description"
              name="description"
              required
              className="textarea-field"
              rows={5}
              placeholder="Describe the feature request in detail. What does the client want? What would need to change?"
            />
          </div>
          {error && (
            <p className="text-sm text-danger-500 bg-danger-500/10 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="btn-primary btn-sm">
              {isPending ? (
                <>
                  <span className="spinner" />
                  Analyzing…
                </>
              ) : (
                "Analyze & Submit"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
