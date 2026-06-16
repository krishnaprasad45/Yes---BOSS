import { Injectable, Logger } from "@nestjs/common";
import Anthropic from "@anthropic-ai/sdk";

export interface CallContext {
  contactName: string | null;
  phoneNumber: string;
  direction: string;
  durationSec: number;
}

/**
 * Turns a call transcript into a short "matter of the call" recap using Claude.
 * No-ops when ANTHROPIC_API_KEY is absent.
 */
@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);
  private client: Anthropic | null = null;

  isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  private getClient(): Anthropic {
    if (!this.client) {
      this.client = new Anthropic(); // reads ANTHROPIC_API_KEY from env
    }
    return this.client;
  }

  async summarize(transcript: string, ctx: CallContext): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("Summary not configured (ANTHROPIC_API_KEY)");
    }
    const who = ctx.contactName ?? ctx.phoneNumber;
    const model = process.env.RECAP_MODEL ?? "claude-opus-4-8";

    const response = await this.getClient().messages.create({
      model,
      max_tokens: 1024,
      system:
        "You summarize phone-call transcripts for the call's owner. Produce a " +
        "tight recap: one sentence on the matter of the call, then 2-5 bullet " +
        "points for key details, decisions, and any action items / follow-ups. " +
        "Be factual; do not invent details not in the transcript.",
      messages: [
        {
          role: "user",
          content:
            `Call with ${who} (${ctx.direction}, ${ctx.durationSec}s).\n\n` +
            `Transcript:\n${transcript}`,
        },
      ],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    if (!text) {
      this.logger.warn("Empty summary returned by the model");
    }
    return text;
  }
}
