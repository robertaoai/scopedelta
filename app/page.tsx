"use client";

import { useState, useEffect, useCallback } from "react";
import { BaselineForm } from "./components/BaselineForm";
import { ChangeRequestForm } from "./components/ChangeRequestForm";
import { ChangeRequestCard } from "./components/ChangeRequestCard";

interface Baseline {
  id: string;
  name: string;
  scope_text: string;
  version: number;
  created_at: string;
}

interface ChangeRequest {
  id: string;
  baseline_id: string;
  title: string;
  description: string;
  status: string;
  draft_document: string | null;
  draft_document_source: string | null;
  draft_document_confidence: number | null;
  draft_document_review_status: string | null;
  created_at: string;
}

export default function Home() {
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [selectedBaseline, setSelectedBaseline] = useState<Baseline | null>(null);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [crLoading, setCrLoading] = useState(false);
  const [editingBaseline, setEditingBaseline] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editScopeText, setEditScopeText] = useState("");

  const fetchBaselines = useCallback(async () => {
    try {
      const res = await fetch("/api/baselines");
      const data = await res.json();
      setBaselines(data);
      if (data.length > 0 && !selectedBaseline) {
        setSelectedBaseline(data[0]);
      }
    } catch (err) {
      console.error("Failed to fetch baselines:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchChangeRequests = useCallback(async (baselineId: string) => {
    setCrLoading(true);
    try {
      const res = await fetch(`/api/change-requests?baseline_id=${baselineId}`);
      const data = await res.json();
      setChangeRequests(data);
    } catch (err) {
      console.error("Failed to fetch change requests:", err);
    } finally {
      setCrLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBaselines();
  }, [fetchBaselines]);

  useEffect(() => {
    if (selectedBaseline) {
      fetchChangeRequests(selectedBaseline.id);
    }
  }, [selectedBaseline, fetchChangeRequests]);

  const handleDeleteBaseline = async (id: string) => {
    if (!confirm("Delete this baseline and all its change requests?")) return;
    await fetch(`/api/baselines/${id}`, { method: "DELETE" });
    if (selectedBaseline?.id === id) {
      setSelectedBaseline(null);
      setChangeRequests([]);
    }
    fetchBaselines();
  };

  const handleSaveEdit = async (id: string) => {
    await fetch(`/api/baselines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, scope_text: editScopeText }),
    });
    setEditingBaseline(null);
    fetchBaselines();
    if (selectedBaseline?.id === id) {
      setSelectedBaseline({ ...selectedBaseline, name: editName, scope_text: editScopeText });
    }
  };

  const handleDeleteCR = async (id: string) => {
    if (!confirm("Delete this change request?")) return;
    await fetch(`/api/change-requests/${id}`, { method: "DELETE" });
    if (selectedBaseline) fetchChangeRequests(selectedBaseline.id);
  };

  const handleStatusChangeCR = async (id: string, status: string) => {
    await fetch(`/api/change-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, draft_document_review_status: status === "accepted" ? "accepted" : "rejected" }),
    });
    if (selectedBaseline) fetchChangeRequests(selectedBaseline.id);
  };

  const stats = {
    total: changeRequests.length,
    inScope: changeRequests.filter(
      (cr) => cr.draft_document?.includes("Aligns with baseline") || (cr.status === "reviewed" && !cr.draft_document?.includes("OUT OF SCOPE") && !cr.draft_document?.includes("PARTIALLY"))
    ).length,
    outOfScope: changeRequests.filter(
      (cr) => cr.draft_document?.includes("OUT OF SCOPE")
    ).length,
    partial: changeRequests.filter(
      (cr) => cr.draft_document?.includes("PARTIALLY IN SCOPE")
    ).length,
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 32, height: 32 }} />
          <p className="text-surface-500">Loading ScopeDelta…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative z-10">
      {/* Header */}
      <header className="border-b border-surface-800/50 backdrop-blur-sm bg-surface-950/80 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <path d="M9 14l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold gradient-text">ScopeDelta</h1>
              <p className="text-xs text-surface-500 hidden sm:block">AI Scope Creep Detector</p>
            </div>
          </div>
          <BaselineForm
            onCreated={() => {
              fetchBaselines();
            }}
          />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Baseline Selector */}
          <aside className="lg:w-80 flex-shrink-0">
            <h2 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">
              Project Baselines
            </h2>
            <div className="space-y-2">
              {baselines.length === 0 ? (
                <div className="glass-card p-6 text-center">
                  <p className="text-surface-500 text-sm mb-3">No baselines yet</p>
                  <p className="text-xs text-surface-600">
                    Create a baseline to define your project scope.
                  </p>
                </div>
              ) : (
                baselines.map((b) => (
                  <div
                    key={b.id}
                    className={`glass-card p-4 cursor-pointer transition-all duration-200 ${
                      selectedBaseline?.id === b.id
                        ? "border-primary-500/40 bg-primary-500/5 shadow-[0_0_20px_rgba(99,102,241,0.1)]"
                        : "glass-card-hover"
                    }`}
                    onClick={() => {
                      setSelectedBaseline(b);
                      setEditingBaseline(null);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-surface-100 text-sm truncate">{b.name}</h3>
                        <p className="text-xs text-surface-500 mt-1 line-clamp-2">
                          {b.scope_text.slice(0, 120)}…
                        </p>
                        <p className="text-xs text-surface-600 mt-1">
                          v{b.version} · {new Date(b.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBaseline(b.id);
                            setEditName(b.name);
                            setEditScopeText(b.scope_text);
                            setSelectedBaseline(b);
                          }}
                          className="p-1.5 rounded-lg hover:bg-surface-700/50 text-surface-500 hover:text-surface-300 transition-colors"
                          title="Edit"
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBaseline(b.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-danger-500/15 text-surface-500 hover:text-danger-500 transition-colors"
                          title="Delete"
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* Right: Main Content */}
          <div className="flex-1 min-w-0">
            {selectedBaseline ? (
              <>
                {/* Baseline Detail / Edit */}
                <div className="glass-card p-5 mb-6">
                  {editingBaseline === selectedBaseline.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="input-field text-lg font-semibold"
                      />
                      <textarea
                        value={editScopeText}
                        onChange={(e) => setEditScopeText(e.target.value)}
                        className="textarea-field"
                        rows={6}
                      />
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingBaseline(null)} className="btn-secondary btn-sm">
                          Cancel
                        </button>
                        <button onClick={() => handleSaveEdit(selectedBaseline.id)} className="btn-primary btn-sm">
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h2 className="text-xl font-bold text-surface-100">{selectedBaseline.name}</h2>
                          <p className="text-xs text-surface-500 mt-1">
                            Baseline v{selectedBaseline.version} · Created {new Date(selectedBaseline.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <ChangeRequestForm
                          baselineId={selectedBaseline.id}
                          baselineName={selectedBaseline.name}
                          baselineScopeText={selectedBaseline.scope_text}
                          onCreated={() => fetchChangeRequests(selectedBaseline.id)}
                        />
                      </div>
                      <div className="bg-surface-950/40 rounded-xl p-4">
                        <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
                          Scope Definition
                        </h3>
                        <p className="text-sm text-surface-300 whitespace-pre-wrap leading-relaxed">
                          {selectedBaseline.scope_text}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Stats Bar */}
                {changeRequests.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    <div className="glass-card p-3 text-center">
                      <p className="text-2xl font-bold text-surface-100">{stats.total}</p>
                      <p className="text-xs text-surface-500">Total Requests</p>
                    </div>
                    <div className="glass-card p-3 text-center">
                      <p className="text-2xl font-bold text-green-400">{stats.inScope}</p>
                      <p className="text-xs text-surface-500">In Scope</p>
                    </div>
                    <div className="glass-card p-3 text-center">
                      <p className="text-2xl font-bold text-red-400">{stats.outOfScope}</p>
                      <p className="text-xs text-surface-500">Out of Scope</p>
                    </div>
                    <div className="glass-card p-3 text-center">
                      <p className="text-2xl font-bold text-amber-400">{stats.partial}</p>
                      <p className="text-xs text-surface-500">Partial</p>
                    </div>
                  </div>
                )}

                {/* Change Requests List */}
                <div>
                  <h3 className="text-sm font-semibold text-surface-400 uppercase tracking-wider mb-3">
                    Change Requests
                  </h3>
                  {crLoading ? (
                    <div className="glass-card p-8 text-center">
                      <div className="spinner mx-auto mb-3" />
                      <p className="text-sm text-surface-500">Loading change requests…</p>
                    </div>
                  ) : changeRequests.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-surface-800/50 flex items-center justify-center mx-auto mb-3">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.5" className="text-surface-600" />
                          <path d="M12 11v6M9 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-surface-600" />
                        </svg>
                      </div>
                      <p className="text-surface-500 text-sm mb-1">No change requests yet</p>
                      <p className="text-xs text-surface-600">
                        Submit a change request to analyze it against this baseline.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {changeRequests.map((cr) => (
                        <ChangeRequestCard
                          key={cr.id}
                          cr={cr}
                          onDelete={handleDeleteCR}
                          onStatusChange={handleStatusChangeCR}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-700/20 flex items-center justify-center mx-auto mb-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" stroke="currentColor" strokeWidth="1.5" className="text-primary-400" />
                    <path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-400" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-surface-200 mb-2">Welcome to ScopeDelta</h2>
                <p className="text-surface-500 text-sm max-w-md mx-auto mb-6">
                  Compare incoming feature requests against your project baseline to automatically flag scope creep and generate formal change requests.
                </p>
                <p className="text-xs text-surface-600">
                  Select a baseline from the left, or create a new one to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
