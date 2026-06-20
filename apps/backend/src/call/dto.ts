import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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

export class CallMetaDto {
  @ApiPropertyOptional({ example: "John Doe" })
  @IsOptional()
  @IsString()
  contactName?: string | null;

  @ApiProperty({ example: "+919876543210" })
  @IsString()
  phoneNumber!: string;

  @ApiProperty({ enum: DIRECTIONS, example: "incoming" })
  @IsIn(DIRECTIONS)
  direction!: CallDirection;

  @ApiProperty({ example: 75, description: "Call duration in seconds" })
  @IsInt()
  @Min(0)
  durationSec!: number;

  @ApiProperty({ example: "2025-06-20T10:30:00.000Z" })
  @IsISO8601()
  occurredAt!: string;
}

export class SyncCallsDto {
  @ApiProperty({ type: [CallMetaDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CallMetaDto)
  items!: CallMetaDto[];
}

export class UploadCallDto {
  @ApiPropertyOptional({ example: "John Doe" })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({ example: "+919876543210" })
  @IsString()
  phoneNumber!: string;

  @ApiProperty({ enum: DIRECTIONS, example: "incoming" })
  @IsIn(DIRECTIONS)
  direction!: CallDirection;

  @ApiProperty({ example: 75, description: "Call duration in seconds" })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  durationSec!: number;

  @ApiProperty({ example: "2025-06-20T10:30:00.000Z" })
  @IsISO8601()
  occurredAt!: string;

  @ApiProperty({ example: "call_20250620_103000.mp4" })
  @IsString()
  sourceFileName!: string;
}

export class ListCallsDto {
  @ApiPropertyOptional({ example: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: "John" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: DIRECTIONS, example: "incoming" })
  @IsOptional()
  @IsIn(DIRECTIONS)
  direction?: CallDirection;

  @ApiPropertyOptional({ example: "2025-06-01T00:00:00.000Z" })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: "2025-06-30T23:59:59.000Z" })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
