"use client";

import { useState, useTransition } from "react";

interface BaselineFormProps {
  onCreated: () => void;
}

export function BaselineForm({ onCreated }: BaselineFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        const res = await fetch("/api/baselines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.get("name"),
            scope_text: formData.get("scope_text"),
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create baseline");
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
        id="new-baseline-btn"
        onClick={() => setOpen(true)}
        className="btn-primary"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        New Baseline
      </button>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div className="modal-content p-6">
        <h2 className="text-lg font-semibold mb-4 gradient-text">Create New Baseline</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="baseline-name" className="block text-sm font-medium text-surface-400 mb-1.5">
              Project Name
            </label>
            <input
              id="baseline-name"
              name="name"
              type="text"
              required
              className="input-field"
              placeholder="e.g., Mobile App Redesign"
            />
          </div>
          <div>
            <label htmlFor="baseline-scope" className="block text-sm font-medium text-surface-400 mb-1.5">
              Scope Definition
            </label>
            <textarea
              id="baseline-scope"
              name="scope_text"
              required
              className="textarea-field"
              rows={6}
              placeholder="Describe the project scope in detail. Include what IS in scope, what is NOT in scope, deliverables, tech stack, and timeline..."
            />
            <p className="text-xs text-surface-500 mt-1.5">
              Tip: Explicitly list exclusions (e.g., &quot;No backend CMS, no authentication&quot;) for better scope detection.
            </p>
          </div>
          {error && (
            <p className="text-sm text-danger-500 bg-danger-500/10 rounded-lg px-3 py-2">{error}</p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="btn-primary btn-sm">
              {isPending ? <span className="spinner" /> : null}
              Create Baseline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
