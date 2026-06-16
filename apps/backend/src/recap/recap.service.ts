import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { Call } from "@yes-boss/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { TranscriptionService } from "./transcription.service";
import { SummaryService } from "./summary.service";

@Injectable()
export class RecapService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private transcription: TranscriptionService,
    private summary: SummaryService,
  ) {}

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
