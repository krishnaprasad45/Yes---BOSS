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
      ? await this.summarizeOpenAiCompat(userMsg)
      : await this.summarizeAnthropic(userMsg);

    if (!text) this.logger.warn("Empty summary returned by the model");
    return text;
  }

  /** OpenAI-compatible chat completions (Groq free tier by default). */
  private async summarizeOpenAiCompat(userMsg: string): Promise<string> {
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
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
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
  private async summarizeAnthropic(userMsg: string): Promise<string> {
    if (!this.client) this.client = new Anthropic(); // reads ANTHROPIC_API_KEY
    const model = process.env.RECAP_MODEL ?? "claude-opus-4-8";

    const response = await this.client.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    });

    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
  }
}
