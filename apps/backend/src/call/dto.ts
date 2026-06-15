import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import type { CallDirection } from "@yes-boss/shared";

const DIRECTIONS: CallDirection[] = ["incoming", "outgoing", "missed", "rejected"];

/** One call-log row pushed from the device (no audio). */
export class CallMetaDto {
  @IsOptional()
  @IsString()
  contactName?: string | null;

  @IsString()
  phoneNumber!: string;

  @IsIn(DIRECTIONS)
  direction!: CallDirection;

  @IsInt()
  @Min(0)
  durationSec!: number;

  @IsISO8601()
  occurredAt!: string;
}

export class SyncCallsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CallMetaDto)
  items!: CallMetaDto[];
}

/**
 * Multipart fields that ride along with a recording upload. Numbers arrive as
 * strings from multipart/form-data, so coerce with @Type.
 */
export class UploadCallDto {
  @IsOptional()
  @IsString()
  contactName?: string;

  @IsString()
  phoneNumber!: string;

  @IsIn(DIRECTIONS)
  direction!: CallDirection;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSec!: number;

  @IsISO8601()
  occurredAt!: string;

  @IsString()
  sourceFileName!: string;
}

export class ListCallsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(DIRECTIONS)
  direction?: CallDirection;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
