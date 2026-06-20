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
import type { TxnType } from "@yes-boss/shared";

const TXN_TYPES: TxnType[] = ["debit", "credit", "payment_due", "spam", "unknown"];

export class SmsTxnSyncItemDto {
  @ApiProperty({ enum: TXN_TYPES, example: "debit" })
  @IsIn(TXN_TYPES)
  type: TxnType;

  @ApiPropertyOptional({ example: 49900, description: "Amount in minor currency units (paise). Null if unknown." })
  @IsOptional()
  @IsInt()
  amountMinor: number | null;

  @ApiPropertyOptional({ example: "Swiggy" })
  @IsOptional()
  @IsString()
  merchant: string | null;

  @ApiPropertyOptional({ example: "HDFC Bank" })
  @IsOptional()
  @IsString()
  source: string | null;

  @ApiProperty({ example: "INR 499.00 debited from HDFC Bank a/c for Swiggy order." })
  @IsString()
  rawBody: string;

  @ApiProperty({ example: "HDFCBK" })
  @IsString()
  sender: string;

  @ApiProperty({ example: "2025-06-20T12:00:00.000Z" })
  @IsISO8601()
  receivedAt: string;

  @ApiPropertyOptional({ example: "2025-07-01T00:00:00.000Z", description: "Due date for payment_due type" })
  @IsOptional()
  @IsISO8601()
  dueAt: string | null;

  @ApiProperty({ example: "abc123hash", description: "Stable device-side hash for dedupe (sender+body+receivedAt)" })
  @IsString()
  dedupeKey: string;
}

export class SyncSmsTxnsDto {
  @ApiProperty({ type: [SmsTxnSyncItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SmsTxnSyncItemDto)
  items: SmsTxnSyncItemDto[];
}

export class ListSmsTxnsDto {
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

  @ApiPropertyOptional({ example: "Swiggy" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: TXN_TYPES, example: "debit" })
  @IsOptional()
  @IsIn(TXN_TYPES)
  type?: TxnType;

  @ApiPropertyOptional({ example: "2025-06-01T00:00:00.000Z" })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: "2025-06-30T23:59:59.000Z" })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class SummaryQueryDto {
  @ApiPropertyOptional({ example: "2025-06-01T00:00:00.000Z" })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: "2025-06-30T23:59:59.000Z" })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
