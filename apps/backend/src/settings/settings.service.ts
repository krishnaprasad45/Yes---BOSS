import { Injectable } from "@nestjs/common";
import type { AutoReplyConfig } from "@yes-boss/shared";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateAutoReplyDto } from "./dto";

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /** Returns the user's auto-reply config, creating the default row on first read. */
  async getAutoReply(userId: string): Promise<AutoReplyConfig> {
    const row = await this.prisma.autoReplyConfig.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return this.toConfig(row);
  }

  async updateAutoReply(
    userId: string,
    dto: UpdateAutoReplyDto,
  ): Promise<AutoReplyConfig> {
    const row = await this.prisma.autoReplyConfig.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
    return this.toConfig(row);
  }

  private toConfig(row: {
    enabled: boolean;
    message: string;
    signature: string;
    cooldownMinutes: number;
    recapEnabled: boolean;
    recapNumber: string;
    updatedAt: Date;
  }): AutoReplyConfig {
    return {
      enabled: row.enabled,
      message: row.message,
      signature: row.signature,
      cooldownMinutes: row.cooldownMinutes,
      recapEnabled: row.recapEnabled,
      recapNumber: row.recapNumber,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
