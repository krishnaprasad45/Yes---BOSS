import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import type { RecapMode } from "@yes-boss/shared";

const RECAP_MODES: RecapMode[] = ["smart", "always_send", "always_ask"];

export class UpdateAutoReplyDto {
  @ApiPropertyOptional({ example: true, description: "Enable or disable auto-reply" })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: "I'm busy. I'll call you back soon.", maxLength: 320 })
  @IsOptional()
  @IsString()
  @MaxLength(320)
  message?: string;

  @ApiPropertyOptional({ example: "Sent by Yes Boss", maxLength: 64 })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  signature?: string;

  @ApiPropertyOptional({ example: 60, minimum: 0, maximum: 1440, description: "Minutes before auto-reply resets for the same contact" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  cooldownMinutes?: number;

  @ApiPropertyOptional({ example: true, description: "Send AI call recap via SMS after each call" })
  @IsOptional()
  @IsBoolean()
  recapEnabled?: boolean;

  @ApiPropertyOptional({ example: "+919876543210", maxLength: 20, description: "Phone number to receive recap SMS" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  recapNumber?: string;

  @ApiPropertyOptional({ enum: RECAP_MODES, example: "smart", description: "When to send recap: smart=only if call has concrete items, always_send=every call, always_ask=prompt user" })
  @IsOptional()
  @IsIn(RECAP_MODES)
  recapMode?: RecapMode;

  @ApiPropertyOptional({ example: false, description: "Include AI-generated caller summary in the auto-reply SMS" })
  @IsOptional()
  @IsBoolean()
  callerSummaryEnabled?: boolean;
}
