import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";

export interface CallContext {
  contactName: string | null;
  phoneNumber: string;
  direction: string;
  durationSec: number;
}

const SYSTEM_PROMPT =
  "You summarize phone-call transcripts for the call's owner. Produce a " +
  "tight recap: one sentence on the matter of the call, then 2-5 bullet " +
  "points for key details, decisions, and any action items / follow-ups. " +
  "Be factual; do not invent details not in the transcript.";

const TONES = ["Friendly", "Formal", "Fun", "Casual", "Tense", "Neutral"] as const;
export type ConversationTone = (typeof TONES)[number];

export interface RecapResult {
  tone: ConversationTone;
  summary: string;
}

const RECAP_SYSTEM_PROMPT =
  "You summarize phone-call transcripts for the call's owner, for an SMS recap. " +
  "Classify the conversation tone as exactly one of: " +
  TONES.join(", ") +
  ". Then write a very short recap: one line on the matter of the call, then " +
  "1-3 short bullet points (key details / decisions / action items). Keep the " +
  "whole summary under ~350 characters so it fits a text message. Be factual; " +
  'do not invent details. Respond ONLY as JSON: {"tone": "...", "summary": "..."}.';

/**
 * Turns a call transcript into a short "matter of the call" recap.
 *
 * Two interchangeable backends, chosen by env:
 *  - OpenAI-compatible chat completions (RECAP_BASE_URL set) — e.g. Groq's free
 *    tier (llama-3.x), or any OpenAI-style endpoint. Preferred when configured.
 *  - Anthropic Claude (ANTHROPIC_API_KEY) — fallback.
 *
 * No-ops (isConfigured = false) when neither is set.
 */
@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private client: Anthropic | null = null;

  /** True when an OpenAI-compatible endpoint (Groq etc.) is configured. */
  private useOpenAiCompat(): boolean {
    return !!process.env.RECAP_BASE_URL && !!process.env.RECAP_API_KEY;
  }

  isConfigured(): boolean {
    return this.useOpenAiCompat() || !!process.env.ANTHROPIC_API_KEY;
  }

  async summarize(transcript: string, ctx: CallContext): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("Summary not configured (RECAP_API_KEY or ANTHROPIC_API_KEY)");
    }
    const who = ctx.contactName ?? ctx.phoneNumber;
    const userMsg =
      `Call with ${who} (${ctx.direction}, ${ctx.durationSec}s).\n\n` +
      `Transcript:\n${transcript}`;

    const text = this.useOpenAiCompat()
      ? await this.summarizeOpenAiCompat(userMsg, SYSTEM_PROMPT, false)
      : await this.summarizeAnthropic(userMsg, SYSTEM_PROMPT);

    if (!text) this.logger.warn("Empty summary returned by the model");
    return text;
  }

  /**
   * Structured recap for the auto-SMS: returns the conversation tone plus a
   * short SMS-sized summary. Falls back to a Neutral/plain summary if the model
   * doesn't return clean JSON.
   */
  async summarizeRecap(transcript: string, ctx: CallContext): Promise<RecapResult> {
    if (!this.isConfigured()) {
      throw new Error("Summary not configured (RECAP_API_KEY or ANTHROPIC_API_KEY)");
    }
    const who = ctx.contactName ?? ctx.phoneNumber;
    const userMsg =
      `Call with ${who} (${ctx.direction}, ${ctx.durationSec}s).\n\n` +
      `Transcript:\n${transcript}`;

    const raw = this.useOpenAiCompat()
      ? await this.summarizeOpenAiCompat(userMsg, RECAP_SYSTEM_PROMPT, true)
      : await this.summarizeAnthropic(userMsg, RECAP_SYSTEM_PROMPT);

    return this.parseRecap(raw);
  }

  private parseRecap(raw: string): RecapResult {
    try {
      // Models sometimes wrap JSON in prose/fences — grab the first {...} block.
      const match = raw.match(/\{[\s\S]*\}/);
      const json = JSON.parse(match ? match[0] : raw) as {
        tone?: string;
        summary?: string;
      };
      const tone = (TONES as readonly string[]).includes(json.tone ?? "")
        ? (json.tone as ConversationTone)
        : "Neutral";
      const summary = (json.summary ?? "").trim();
      if (summary) return { tone, summary };
    } catch {
      this.logger.warn("Recap JSON parse failed; using raw text");
    }
    return { tone: "Neutral", summary: raw.trim() };
  }

  /** OpenAI-compatible chat completions (Groq free tier by default). */
  private async summarizeOpenAiCompat(
    userMsg: string,
    system: string,
    jsonMode: boolean,
  ): Promise<string> {
    const baseUrl = process.env.RECAP_BASE_URL as string;
    const apiKey = process.env.RECAP_API_KEY as string;
    const model = process.env.RECAP_MODEL ?? "llama-3.3-70b-versatile";

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      this.logger.error(`Summary failed (${res.status}): ${body.slice(0, 200)}`);
      throw new Error(`Summary failed (${res.status})`);
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return json.choices?.[0]?.message?.content?.trim() ?? "";
  }

  /** Anthropic Claude fallback. */
  private async summarizeAnthropic(userMsg: string, system: string): Promise<string> {
    if (!this.client) this.client = new Anthropic(); // reads ANTHROPIC_API_KEY
    const model = process.env.RECAP_MODEL ?? "claude-opus-4-8";

    const response = await this.client.messages.create({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: userMsg }],
    });

    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  }
}
