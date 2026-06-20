import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Call } from "@yes-boss/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { CallService } from "../call/call.service";
import type { UploadCallDto } from "../call/dto";
import { TranscriptionService } from "./transcription.service";
import { SummaryService, isActionable } from "./summary.service";
import type { RecapEntities } from "./summary.service";

@Injectable()
export class RecapService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private calls: CallService,
    private transcription: TranscriptionService,
    private summary: SummaryService,
  ) {}

  /**
   * Background flow: device uploads a just-ended recorded call, we transcribe +
   * summarize it and return a ready-to-send SMS recap body. The phone (which
   * holds the SIM) sends the SMS to the owner. Saved-contact calls only — the
   * device gates that before calling here.
   */
  async autoRecap(
    meta: UploadCallDto,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<{ smsBody: string; actionable: boolean; contactSmsBody: string }> {
    if (!this.transcription.isConfigured() || !this.summary.isConfigured()) {
      throw new BadRequestException("Recap providers not configured");
    }

    // Store the recording + upsert the call row (reuses the backup pipeline).
    await this.calls.uploadRecording(meta, file);

    const transcript = await this.transcription.transcribe(
      file.buffer,
      file.originalname,
    );
    if (!transcript.trim()) {
      throw new BadRequestException("Empty transcript — nothing to recap");
    }

    const recap = await this.summary.summarizeRecap(transcript, {
      contactName: meta.contactName ?? null,
      phoneNumber: meta.phoneNumber,
      direction: meta.direction,
      durationSec: meta.durationSec,
    });

    // Persist transcript + summary on the call.
    await this.prisma.call.update({
      where: {
        phoneNumber_occurredAt: {
          phoneNumber: meta.phoneNumber,
          occurredAt: new Date(meta.occurredAt),
        },
      },
      data: { transcript, summary: recap.summary },
    });

    const actionable = isActionable(recap.entities);
    return {
      smsBody: this.buildSms(meta, recap.tone, recap.summary, recap.entities),
      actionable,
      // Caller-facing confirmation — only meaningful when there are concrete
      // items to confirm; the device sends it only if the owner opted in.
      contactSmsBody: actionable ? this.buildContactSms(meta, recap.entities) : "",
    };
  }

  private buildSms(
    meta: UploadCallDto,
    tone: string,
    summary: string,
    entities: RecapEntities,
  ): string {
    const name = meta.contactName?.trim() || meta.phoneNumber;
    const dir = meta.direction.charAt(0).toUpperCase() + meta.direction.slice(1);
    const dur = formatDuration(meta.durationSec);
    const when = formatWhen(new Date(meta.occurredAt));

    // Scannable actionable block — only the lines that have content.
    const lines: string[] = [];
    for (const d of entities.dates) lines.push(`📅 ${d}`);
    for (const a of entities.amounts) lines.push(`💰 ${a}`);
    for (const it of entities.items) lines.push(`🧾 ${it}`);
    for (const p of entities.phones) lines.push(`☎ ${p}`);
    for (const act of entities.actions) lines.push(`✅ ${act}`);
    const actionBlock = lines.length ? `\n${lines.join("\n")}` : "";

    return (
      `📞 Call Recap — ${name}\n` +
      `${dir} · ${dur} · ${when}\n` +
      `Tone: ${tone}\n\n` +
      `${summary}${actionBlock}\n\n` +
      `— AI recap. AI can make mistakes; verify key details.`
    );
  }

  /**
   * Caller-facing confirmation of the concrete points agreed on the call. No
   * tone/private analysis — just the items, framed as a recap to the other
   * party. Only sent when the owner enabled caller summaries.
   */
  private buildContactSms(meta: UploadCallDto, entities: RecapEntities): string {
    const lines: string[] = [];
    for (const d of entities.dates) lines.push(`📅 ${d}`);
    for (const a of entities.amounts) lines.push(`💰 ${a}`);
    for (const it of entities.items) lines.push(`🧾 ${it}`);
    for (const act of entities.actions) lines.push(`✅ ${act}`);

    return (
      `Hi, quick summary of our call:\n` +
      `${lines.join("\n")}\n\n` +
      `Please confirm if this looks right.\n` +
      `— Auto-summary, sent for your reference.`
    );
  }

  /** Whether both halves of the pipeline are configured. */
  status(): { transcription: boolean; summary: boolean } {
    return {
      transcription: this.transcription.isConfigured(),
      summary: this.summary.isConfigured(),
    };
  }

  /**
   * Generate a recap for one call: fetch the recording, transcribe it, then
   * summarize with Claude. Skips work that's already done unless `force`.
   */
  async generate(callId: string, force = false): Promise<Call> {
    const call = await this.prisma.call.findUnique({ where: { id: callId } });
    if (!call) throw new NotFoundException("Call not found");
    if (!call.recordingUrl) {
      throw new BadRequestException("Call has no recording to recap");
    }

    let transcript = call.transcript;
    if (!transcript || force) {
      if (!this.transcription.isConfigured()) {
        throw new BadRequestException("Transcription not configured");
      }
      const audio = await this.storage.getObject(call.recordingUrl);
      transcript = await this.transcription.transcribe(
        audio,
        call.sourceFileName ?? `${call.id}.mp3`,
      );
    }

    let summary = call.summary;
    if (!summary || force) {
      if (!this.summary.isConfigured()) {
        throw new BadRequestException("Summary not configured");
      }
      summary = await this.summary.summarize(transcript, {
        contactName: call.contactName,
        phoneNumber: call.phoneNumber,
        direction: call.direction,
        durationSec: call.durationSec,
      });
    }

    const updated = await this.prisma.call.update({
      where: { id: callId },
      data: { transcript, summary },
    });

    return {
      id: updated.id,
      contactName: updated.contactName,
      phoneNumber: updated.phoneNumber,
      direction: updated.direction as Call["direction"],
      durationSec: updated.durationSec,
      occurredAt: updated.occurredAt.toISOString(),
      recordingUrl: updated.recordingUrl
        ? await this.storage.getSignedUrl(updated.recordingUrl)
        : null,
      transcript: updated.transcript,
      summary: updated.summary,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}

function formatDuration(sec: number): string {
  if (sec <= 0) return "0s";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatWhen(d: Date): string {
  const day = d.getDate();
  const month = d.toLocaleString("en-US", { month: "short" });
  let h = d.getHours();
  const min = d.getMinutes().toString().padStart(2, "0");
  const period = h < 12 ? "am" : "pm";
  h = h % 12 === 0 ? 12 : h % 12;
  return `${day} ${month}, ${h}:${min}${period}`;
}
