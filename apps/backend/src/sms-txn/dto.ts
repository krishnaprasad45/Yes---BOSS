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

/** One parsed SMS in a sync batch (parsed on device). */
export class SmsTxnSyncItemDto {
  @IsIn(TXN_TYPES)
  type: TxnType;

  @IsOptional()
  @IsInt()
  amountMinor: number | null;

  @IsOptional()
  @IsString()
  merchant: string | null;

  @IsOptional()
  @IsString()
  source: string | null;

  @IsString()
  rawBody: string;

  @IsString()
  sender: string;

  @IsISO8601()
  receivedAt: string;

  @IsOptional()
  @IsISO8601()
  dueAt: string | null;

  /** Stable device-side hash for dedupe (sender + body + receivedAt). */
  @IsString()
  dedupeKey: string;
}

export class SyncSmsTxnsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SmsTxnSyncItemDto)
  items: SmsTxnSyncItemDto[];
}

/** Query params for the paginated list. */
export class ListSmsTxnsDto {
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
  @IsIn(TXN_TYPES)
  type?: TxnType;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

/** Query params for the spending summary (date window only). */
export class SummaryQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
