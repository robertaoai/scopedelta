"use client";

import { useState } from "react";

interface ChangeRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  draft_document: string | null;
  draft_document_source: string | null;
  draft_document_confidence: number | null;
  draft_document_review_status: string | null;
  created_at: string;
}

interface ChangeRequestCardProps {
  cr: ChangeRequest;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}

export function ChangeRequestCard({ cr, onDelete, onStatusChange }: ChangeRequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDocument, setShowDocument] = useState(false);

  const verdictFromDoc = cr.draft_document
    ? cr.draft_document.includes("OUT OF SCOPE")
      ? "out-of-scope"
      : cr.draft_document.includes("PARTIALLY IN SCOPE")
        ? "partial"
        : cr.draft_document.includes("IN SCOPE") || cr.draft_document.includes("Aligns with baseline")
          ? "in-scope"
          : "draft"
    : "draft";

  const badgeClass =
    verdictFromDoc === "in-scope"
      ? "badge-in-scope"
      : verdictFromDoc === "out-of-scope"
        ? "badge-out-of-scope"
        : verdictFromDoc === "partial"
          ? "badge-partial"
          : cr.status === "reviewed"
            ? "badge-reviewed"
            : "badge-draft";

  const badgeLabel =
    verdictFromDoc === "in-scope"
      ? "In Scope"
      : verdictFromDoc === "out-of-scope"
        ? "Out of Scope"
        : verdictFromDoc === "partial"
          ? "Partial"
          : cr.status === "reviewed"
            ? "Reviewed"
            : "Draft";

  const confidence = cr.draft_document_confidence;
  const confidenceColor =
    confidence && confidence >= 0.8
      ? "bg-success-500"
      : confidence && confidence >= 0.6
        ? "bg-warning-500"
        : "bg-danger-500";

  return (
    <div className="glass-card glass-card-hover p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4
              className="font-medium text-surface-100 truncate cursor-pointer hover:text-primary-400 transition-colors"
              onClick={() => setExpanded(!expanded)}
            >
              {cr.title}
            </h4>
            <span className={`badge ${badgeClass}`}>
              {badgeLabel}
            </span>
          </div>
          <p className="text-sm text-surface-400 line-clamp-2">{cr.description}</p>

          {confidence !== null && confidence !== undefined && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-surface-500">Confidence</span>
              <div className="confidence-bar flex-1 max-w-[120px]">
                <div
                  className={`confidence-fill ${confidenceColor}`}
                  style={{ width: `${Math.round(confidence * 100)}%` }}
                />
              </div>
              <span className="text-xs text-surface-400 font-mono">{Math.round(confidence * 100)}%</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {cr.draft_document && (
            <button
              onClick={() => setShowDocument(!showDocument)}
              className="btn-secondary btn-sm text-xs"
              title="View change request document"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 2h5l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Doc
            </button>
          )}
          <button
            onClick={() => onDelete(cr.id)}
            className="btn-danger btn-sm text-xs"
            title="Delete"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-surface-700/50 animate-fade-in">
          <p className="text-sm text-surface-300 whitespace-pre-wrap">{cr.description}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-surface-500">
            <span>Source: {cr.draft_document_source || "—"}</span>
            <span>·</span>
            <span>Review: {cr.draft_document_review_status || "—"}</span>
            <span>·</span>
            <span>{new Date(cr.created_at).toLocaleDateString()}</span>
          </div>
          {cr.status === "reviewed" && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => onStatusChange(cr.id, "accepted")}
                className="btn-sm text-xs px-3 py-1.5 rounded-lg bg-success-500/15 text-success-500 border border-success-500/20 hover:bg-success-500/25 transition-colors cursor-pointer"
              >
                Accept
              </button>
              <button
                onClick={() => onStatusChange(cr.id, "rejected")}
                className="btn-sm text-xs px-3 py-1.5 rounded-lg bg-danger-500/15 text-danger-500 border border-danger-500/20 hover:bg-danger-500/25 transition-colors cursor-pointer"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      )}

      {showDocument && cr.draft_document && (
        <div className="mt-3 pt-3 border-t border-surface-700/50 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-primary-400">PMI Change Request Document</h5>
            <button
              onClick={() => {
                navigator.clipboard.writeText(cr.draft_document || "");
              }}
              className="text-xs text-surface-500 hover:text-surface-300 transition-colors cursor-pointer"
            >
              Copy
            </button>
          </div>
          <pre className="text-xs text-surface-300 whitespace-pre-wrap bg-surface-950/50 rounded-lg p-4 max-h-[400px] overflow-y-auto custom-scrollbar font-mono leading-relaxed">
            {cr.draft_document}
          </pre>
        </div>
      )}
    </div>
  );
}
