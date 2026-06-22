import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsHexColor,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateCategoryDto {
  @ApiProperty({ example: "Food & Dining" })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: "#2DD4BF" })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ example: 150000, description: "Daily budget in minor units (paise)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyBudgetMinor?: number | null;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: "Groceries" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: "#FBA94C" })
  @IsOptional()
  @IsHexColor()
  color?: string;

  @ApiPropertyOptional({ example: 150000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyBudgetMinor?: number | null;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class UpdateFinanceConfigDto {
  @ApiPropertyOptional({ example: 500000, description: "Daily budget in minor units (paise)" })
  @IsOptional()
  @IsInt()
  @Min(0)
  dailyBudgetMinor?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  manualEntryEnabled?: boolean;
}

export class ManualTxnDto {
  @ApiProperty({ enum: ["debit", "credit"], example: "debit" })
  @IsIn(["debit", "credit"])
  type: "debit" | "credit";

  @ApiProperty({ example: 49900, description: "Amount in minor units (paise)" })
  @IsInt()
  @Min(1)
  amountMinor: number;

  @ApiPropertyOptional({ example: "Food & Dining" })
  @IsOptional()
  @IsString()
  category?: string | null;

  @ApiPropertyOptional({ example: "Lunch with team" })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ example: "2026-06-21T12:00:00.000Z" })
  @IsOptional()
  @IsISO8601()
  occurredAt?: string;
}

export class InsightsQueryDto {
  @ApiPropertyOptional({ example: "2026-06-21T00:00:00.000Z" })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: "2026-06-21T23:59:59.999Z" })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
