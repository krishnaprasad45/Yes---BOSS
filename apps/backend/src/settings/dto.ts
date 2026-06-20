import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import type { RecapMode } from "@yes-boss/shared";

const RECAP_MODES: RecapMode[] = ["smart", "always_send", "always_ask"];

export class UpdateAutoReplyDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  signature?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  cooldownMinutes?: number;

  @IsOptional()
  @IsBoolean()
  recapEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  recapNumber?: string;

  @IsOptional()
  @IsIn(RECAP_MODES)
  recapMode?: RecapMode;

  @IsOptional()
  @IsBoolean()
  callerSummaryEnabled?: boolean;
}
