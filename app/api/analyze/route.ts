import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/analyze
 *
 * Compares a change request description against a baseline scope text.
 * Uses keyword/phrase matching to produce a structured scope-variance analysis
 * and a PMI-style change request document when out-of-scope items are found.
 *
 * This engine works WITHOUT an external AI API key — it's a rules-based
 * NLP analyzer. The core must work with AI switched off (per AGENTS.md).
 */

interface AnalysisItem {
  item: string;
  verdict: "in-scope" | "out-of-scope" | "partial";
  reasoning: string;
}

interface AnalysisResult {
  items: AnalysisItem[];
  overall_verdict: "in-scope" | "out-of-scope" | "partial";
  summary: string;
  change_request_document: string | null;
  confidence: number;
  source: string;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function extractPhrases(text: string): string[] {
  const sentences = text
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const phrases: string[] = [];

  for (const sentence of sentences) {
    phrases.push(sentence.toLowerCase());
    // Also extract noun phrases (simple: 2-3 word combos)
    const words = tokenize(sentence);
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(words.slice(i, i + 2).join(" "));
      if (i < words.length - 2) {
        phrases.push(words.slice(i, i + 3).join(" "));
      }
    }
  }
  return phrases;
}

function findExclusions(scopeText: string): string[] {
  const exclusionPatterns = [
    /no\s+(.+?)(?:\.|,|$)/gi,
    /not\s+(?:include|including|included)\s*:?\s*(.+?)(?:\.|,|$)/gi,
    /out\s+of\s+scope\s*:?\s*(.+?)(?:\.|$)/gi,
    /exclud(?:e|es|ed|ing)\s*:?\s*(.+?)(?:\.|,|$)/gi,
    /without\s+(.+?)(?:\.|,|$)/gi,
    /will\s+not\s+(.+?)(?:\.|,|$)/gi,
    /(?:does|do)\s+not\s+(?:include|cover)\s+(.+?)(?:\.|,|$)/gi,
  ];

  const exclusions: string[] = [];
  for (const pattern of exclusionPatterns) {
    let match;
    while ((match = pattern.exec(scopeText)) !== null) {
      // Split on commas to get individual items
      const items = match[1].split(/,\s*(?:and\s+)?|,\s*/);
      for (const item of items) {
        const cleaned = item.trim().toLowerCase();
        if (cleaned.length > 2) {
          exclusions.push(cleaned);
        }
      }
    }
  }

  return exclusions;
}

function findInclusions(scopeText: string): string[] {
  const inclusionPatterns = [
    /(?:include|includes|including)\s*:?\s*(.+?)(?:\.|$)/gi,
    /scope\s*:?\s*(.+?)(?:\.|$)/gi,
    /deliverables?\s*(?:are|is|include)?\s*:?\s*(.+?)(?:\.|$)/gi,
    /(?:will|shall)\s+(?:have|include|contain|provide|support)\s+(.+?)(?:\.|$)/gi,
    /(?:features?|capabilities)\s*:?\s*(.+?)(?:\.|$)/gi,
  ];

  const inclusions: string[] = [];
  for (const pattern of inclusionPatterns) {
    let match;
    while ((match = pattern.exec(scopeText)) !== null) {
      const items = match[1].split(/,\s*(?:and\s+)?|,\s*/);
      for (const item of items) {
        const cleaned = item.trim().toLowerCase();
        if (cleaned.length > 2) {
          inclusions.push(cleaned);
        }
      }
    }
  }

  return inclusions;
}

function computeOverlap(
  requestTokens: string[],
  targetPhrases: string[]
): number {
  let matches = 0;
  for (const token of requestTokens) {
    for (const phrase of targetPhrases) {
      if (phrase.includes(token) || token.includes(phrase)) {
        matches++;
        break;
      }
    }
  }
  return requestTokens.length > 0 ? matches / requestTokens.length : 0;
}

function analyzeRequest(
  baselineScopeText: string,
  requestTitle: string,
  requestDescription: string,
  projectName: string = "[Baseline Project]"
): AnalysisResult {
  const exclusions = findExclusions(baselineScopeText);
  const inclusions = findInclusions(baselineScopeText);
  const baselineTokens = tokenize(baselineScopeText);
  const baselinePhrases = extractPhrases(baselineScopeText);

  const requestText = `${requestTitle} ${requestDescription}`;
  const requestTokens = tokenize(requestText);
  const requestPhrases = extractPhrases(requestDescription);

  const items: AnalysisItem[] = [];

  // Check each sentence of the request as a separate item
  const requestSentences = requestDescription
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  for (const sentence of requestSentences) {
    const sentenceTokens = tokenize(sentence);
    const sentenceLower = sentence.toLowerCase();

    // Check against exclusions
    let matchedExclusion: string | null = null;
    for (const excl of exclusions) {
      const exclTokens = tokenize(excl);
      const overlap = exclTokens.filter((t) =>
        sentenceTokens.some(
          (st) => st === t || st.includes(t) || t.includes(st)
        )
      );
      if (overlap.length >= Math.max(1, exclTokens.length * 0.4)) {
        matchedExclusion = excl;
        break;
      }
    }

    if (matchedExclusion) {
      items.push({
        item: sentence,
        verdict: "out-of-scope",
        reasoning: `Matches excluded scope item: "${matchedExclusion}". The baseline explicitly excludes this.`,
      });
      continue;
    }

    // Check against inclusions
    let matchedInclusion: string | null = null;
    for (const incl of inclusions) {
      const inclTokens = tokenize(incl);
      const overlap = inclTokens.filter((t) =>
        sentenceTokens.some(
          (st) => st === t || st.includes(t) || t.includes(st)
        )
      );
      if (overlap.length >= Math.max(1, inclTokens.length * 0.4)) {
        matchedInclusion = incl;
        break;
      }
    }

    if (matchedInclusion) {
      items.push({
        item: sentence,
        verdict: "in-scope",
        reasoning: `Aligns with baseline scope: "${matchedInclusion}".`,
      });
      continue;
    }

    // Check general token overlap with the whole baseline
    const overlapScore = computeOverlap(sentenceTokens, baselinePhrases);

    if (overlapScore > 0.5) {
      items.push({
        item: sentence,
        verdict: "partial",
        reasoning: `Partially related to baseline (${Math.round(overlapScore * 100)}% term overlap), but not explicitly included or excluded. Requires clarification.`,
      });
    } else {
      items.push({
        item: sentence,
        verdict: "out-of-scope",
        reasoning: `Low relevance to baseline scope (${Math.round(overlapScore * 100)}% term overlap). This appears to be a new requirement not covered in the original scope.`,
      });
    }
  }

  // If no sentences extracted, analyze as a whole
  if (items.length === 0) {
    const overlapScore = computeOverlap(requestTokens, baselinePhrases);
    const matchedExclusion = exclusions.find((excl) => {
      const exclTokens = tokenize(excl);
      return exclTokens.some((t) => requestTokens.includes(t));
    });

    items.push({
      item: requestDescription,
      verdict: matchedExclusion
        ? "out-of-scope"
        : overlapScore > 0.4
          ? "partial"
          : "out-of-scope",
      reasoning: matchedExclusion
        ? `Matches excluded scope item: "${matchedExclusion}".`
        : `Overall relevance to baseline: ${Math.round(overlapScore * 100)}%.`,
    });
  }

  // Determine overall verdict
  const verdicts = items.map((i) => i.verdict);
  const outCount = verdicts.filter((v) => v === "out-of-scope").length;
  const inCount = verdicts.filter((v) => v === "in-scope").length;

  let overall_verdict: "in-scope" | "out-of-scope" | "partial";
  if (outCount === 0 && inCount > 0) {
    overall_verdict = "in-scope";
  } else if (inCount === 0 && outCount > 0) {
    overall_verdict = "out-of-scope";
  } else {
    overall_verdict = "partial";
  }

  const confidence = Math.min(
    0.95,
    0.6 + items.length * 0.05 + (exclusions.length > 0 ? 0.1 : 0)
  );

  const summary =
    overall_verdict === "in-scope"
      ? `This change request aligns with the baseline scope. ${inCount} item(s) matched existing scope definitions.`
      : overall_verdict === "out-of-scope"
        ? `This change request falls outside the baseline scope. ${outCount} item(s) do not match the original scope definition. A formal change request is recommended.`
        : `This change request is partially in scope. ${inCount} item(s) align with the baseline, but ${outCount} item(s) fall outside the original scope.`;

  // Generate PMI-style change request if out of scope
  let change_request_document: string | null = null;
  if (overall_verdict !== "in-scope") {
    const today = new Date().toISOString().split("T")[0];
    const outOfScopeItems = items
      .filter((i) => i.verdict === "out-of-scope")
      .map((i) => `  - ${i.item}`)
      .join("\n");
    const inScopeItems = items
      .filter((i) => i.verdict === "in-scope")
      .map((i) => `  - ${i.item}`)
      .join("\n");
    const partialItems = items
      .filter((i) => i.verdict === "partial")
      .map((i) => `  - ${i.item}`)
      .join("\n");

    change_request_document = `CHANGE REQUEST
Project: ${projectName}
Date: ${today}
Submitted by: [Requestor]

1. DESCRIPTION OF CHANGE
${requestTitle}: ${requestDescription}

2. JUSTIFICATION
[To be filled by requestor — explain why this change is needed]

3. SCOPE IMPACT
${
  overall_verdict === "out-of-scope"
    ? "OUT OF SCOPE — This request introduces requirements not covered in the original baseline."
    : "PARTIALLY IN SCOPE — Some elements align with the baseline, but new requirements are introduced."
}

Out-of-scope items:
${outOfScopeItems || "  (none)"}
${
  inScopeItems
    ? `
In-scope items:
${inScopeItems}`
    : ""
}
${
  partialItems
    ? `
Items requiring clarification:
${partialItems}`
    : ""
}

4. SCHEDULE IMPACT
Estimated: [To be assessed by project team]

5. RECOMMENDATION
${
  overall_verdict === "out-of-scope"
    ? "Escalate for sponsor approval. If approved, update baseline scope and reassess timeline and budget."
    : "Review with project team. In-scope items can proceed; out-of-scope items require sponsor approval."
}`;
  }

  return {
    items,
    overall_verdict,
    summary,
    change_request_document,
    confidence,
    source: "scopedelta/rules-engine-v1",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baseline_scope_text, baseline_name, request_title, request_description } = body;

    if (!baseline_scope_text || !request_title || !request_description) {
      return NextResponse.json(
        {
          error:
            "baseline_scope_text, request_title, and request_description are required",
        },
        { status: 400 }
      );
    }

    const projectName = baseline_name || "[Baseline Project]";

    const result = analyzeRequest(
      baseline_scope_text,
      request_title,
      request_description,
      projectName
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze change request" },
      { status: 500 }
    );
  }
}
