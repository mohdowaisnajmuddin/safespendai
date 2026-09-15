/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  DEFAULT_EVENTS,
  DEFAULT_EXCHANGE_RATES,
  DEFAULT_IMAGES,
  DEFAULT_MESSAGES,
  DEFAULT_PAYMENT_OPTIONS,
  DEFAULT_PROFILES,
  DEFAULT_REQUESTS,
} from './src/data/defaultDatasets';
import { CurrencyConverter } from './src/engine/currency';
import { runAffordabilityDecision } from './src/engine/decisionEngine';
import { reconstructCanonicalLedger } from './src/engine/ledger';
import { runBatchEvaluation } from './src/engine/batchEvaluator';
import { AffordabilityRequest, AuditTrace } from './src/types/affordability';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// In-memory store for audit traces (GET /v1/affordability/analyses/:analysis_id/audit)
const auditTraceStore = new Map<string, AuditTrace>();

// Lazy server-side Gemini client
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// ==========================================
// API Routes (Section 15 API Contract)
// ==========================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    product: 'Buy or Wait?',
    version: '1.0.0',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});

/**
 * POST /v1/affordability/analyses
 * Main affordability analysis API contract
 */
app.post('/v1/affordability/analyses', (req, res) => {
  try {
    const request: AffordabilityRequest = req.body.request;
    if (!request || !request.request_id || !request.requested_amount) {
      return res.status(400).json({ error: 'Missing required request fields' });
    }

    const profiles = req.body.profiles || DEFAULT_PROFILES;
    const events = req.body.events || DEFAULT_EVENTS;
    const paymentOptions = req.body.payment_options || DEFAULT_PAYMENT_OPTIONS;
    const messages = req.body.messages || DEFAULT_MESSAGES;
    const images = req.body.images || DEFAULT_IMAGES;
    const exchangeRates = req.body.exchange_rates || DEFAULT_EXCHANGE_RATES;

    const userProfile =
      profiles.find((p: any) => p.user_id === request.user_id) ||
      DEFAULT_PROFILES.find((p) => p.user_id === 'user_sarah')!;

    const converter = new CurrencyConverter(exchangeRates);

    // Step 1: Reconstruct canonical ledger
    const { items, assumptions, conflictsResolved, extractionFacts } = reconstructCanonicalLedger(
      userProfile,
      events,
      messages,
      images,
      converter
    );

    // Step 2: Run deterministic decision engine
    const decision = runAffordabilityDecision(
      request,
      userProfile,
      items,
      paymentOptions,
      converter,
      assumptions
    );

    decision.audit_trace.conflicts_resolved = conflictsResolved;
    decision.audit_trace.extraction_facts = extractionFacts;

    // Store audit trace
    auditTraceStore.set(decision.audit_trace.analysis_id, decision.audit_trace);

    res.json({
      request_id: decision.request_id,
      amount_safe_to_pay: decision.amount_safe_to_pay,
      affordability_status: decision.affordability_status,
      recommended_payment_method: decision.recommended_payment_method,
      payment_plan: decision.payment_plan,
      earliest_date_for_full_payment: decision.earliest_date_for_full_payment,
      spending_changes_needed: decision.spending_changes_needed,
      decision_explanation: decision.decision_explanation,
      forecast: decision.forecast,
      assumptions: decision.assumptions,
      alternatives: decision.alternatives,
      analysis_id: decision.audit_trace.analysis_id,
      audit_trace: decision.audit_trace,
    });
  } catch (err: any) {
    console.error('Error in /v1/affordability/analyses:', err);
    res.status(500).json({ error: err.message || 'Affordability evaluation failed' });
  }
});

/**
 * GET /v1/affordability/analyses/:analysis_id/audit
 * Audit endpoint returning ledger details, conflicts, candidates
 */
app.get('/v1/affordability/analyses/:analysis_id/audit', (req, res) => {
  const { analysis_id } = req.params;
  const audit = auditTraceStore.get(analysis_id);
  if (!audit) {
    return res.status(404).json({ error: 'Audit trace not found for analysis_id' });
  }
  res.json(audit);
});

/**
 * POST /api/batch-evaluate
 * Evaluates a batch of requests and generates output.csv and reports
 */
app.post('/api/batch-evaluate', (req, res) => {
  try {
    const requests = req.body.requests || DEFAULT_REQUESTS;
    const profiles = req.body.profiles || DEFAULT_PROFILES;
    const events = req.body.events || DEFAULT_EVENTS;
    const paymentOptions = req.body.payment_options || DEFAULT_PAYMENT_OPTIONS;
    const messages = req.body.messages || DEFAULT_MESSAGES;
    const images = req.body.images || DEFAULT_IMAGES;
    const exchangeRates = req.body.exchange_rates || DEFAULT_EXCHANGE_RATES;

    const evaluation = runBatchEvaluation(
      requests,
      profiles,
      events,
      paymentOptions,
      messages,
      images,
      exchangeRates
    );

    // Save individual audit traces
    for (const r of evaluation.results) {
      auditTraceStore.set(r.audit_trace.analysis_id, r.audit_trace);
    }

    res.json(evaluation);
  } catch (err: any) {
    console.error('Error in batch evaluation:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/extract
 * Multimodal AI extraction service (messages or images)
 */
app.post('/api/extract', async (req, res) => {
  const { textContent, base64Image, mimeType, user_id, related_event_id } = req.body;

  const ai = getGenAI();

  // If Gemini API is not available or key missing, provide deterministic structured response
  if (!ai) {
    // Regex-based deterministic fallback for quick offline response
    let extractedAmount: number | undefined;
    if (textContent) {
      const match = textContent.match(/[$€₹R]|(?:Rp\s*)?(\d+([.,]\d+)?)/);
      if (match && match[1]) {
        extractedAmount = parseFloat(match[1].replace(/,/g, ''));
      }
    }
    return res.json({
      entity_type: 'financial_fact',
      related_event_id: related_event_id || 'evt_inferred',
      action: 'extracted_fact',
      amount: extractedAmount || 150,
      currency: 'USD',
      effective_date: '2026-09-20',
      confidence: 0.85,
      evidence_span: textContent?.slice(0, 80) || 'Deterministic OCR fallback',
      source: 'offline_heuristic_extractor',
    });
  }

  try {
    const parts: any[] = [];
    if (base64Image) {
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/png',
          data: base64Image,
        },
      });
    }

    const prompt = `You are a financial extraction service for the "Buy or Wait?" affordability agent.
Extract structured financial facts from this document/message.
Extract:
- entity_type (e.g. invoice, receipt, payment_confirmation, bill)
- related_event_id (if mentioned or relevant)
- action (one of: amend_amount, cancel_event, confirm_income, delay_date, extract_missing_amount)
- amount (numeric value only)
- currency (INR, ZAR, IDR, USD, EUR)
- effective_date (YYYY-MM-DD)
- confidence (0.0 to 1.0)
- evidence_span (exact quote or text snippet)

Content to extract from:
${textContent || 'See attached image'}`;

    parts.push({ text: prompt });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            entity_type: { type: Type.STRING },
            related_event_id: { type: Type.STRING },
            action: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            effective_date: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            evidence_span: { type: Type.STRING },
          },
          required: ['action', 'amount', 'currency', 'confidence'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json({
      ...parsed,
      source: 'gemini-3.8-flash',
    });
  } catch (err: any) {
    console.error('Gemini extraction error:', err);
    res.status(500).json({
      error: 'Extraction failed',
      details: err.message,
    });
  }
});

// ==========================================
// Vite Middleware / Static Serving
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Buy or Wait? server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
