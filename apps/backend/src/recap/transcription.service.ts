import { Injectable, Logger } from "@nestjs/common";

/**
 * Speech-to-text for call recordings via a Whisper-compatible REST endpoint
 * (OpenAI Whisper by default). This is ASR only — the LLM summary is a separate
 * step (see SummaryService, which uses Claude). No-ops when unconfigured.
 */
@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  isConfigured(): boolean {
    return !!process.env.WHISPER_API_KEY;
  }

  async transcribe(audio: Buffer, fileName: string): Promise<string> {
    const apiKey = process.env.WHISPER_API_KEY;
    if (!apiKey) throw new Error("Transcription not configured (WHISPER_API_KEY)");

    const baseUrl = process.env.WHISPER_BASE_URL ?? "https://api.openai.com/v1";
    const model = process.env.WHISPER_MODEL ?? "whisper-1";

    const form = new FormData();
    // Copy into a plain Uint8Array so it's a valid BlobPart (Buffer's backing
    // store can be a SharedArrayBuffer, which Blob's types reject).
    form.append("file", new Blob([new Uint8Array(audio)]), fileName);
    form.append("model", model);
    // Optional language hint (e.g. "hi", "en"). Whisper auto-detect mislabels
    // short/noisy clips; pinning the language keeps the transcript accurate.
    if (process.env.WHISPER_LANGUAGE) {
      form.append("language", process.env.WHISPER_LANGUAGE);
    }

    const res = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      this.logger.error(`Whisper failed (${res.status}): ${body.slice(0, 200)}`);
      throw new Error(`Transcription failed (${res.status})`);
    }
    const json = (await res.json()) as { text?: string };
    return json.text ?? "";
  }
}
