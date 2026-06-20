import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsISO8601, IsOptional } from "class-validator";

export class RangeQueryDto {
  @ApiPropertyOptional({ example: "2025-06-01T00:00:00.000Z" })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: "2025-06-30T23:59:59.000Z" })
  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class DigestQueryDto {
  @ApiPropertyOptional({ example: "2025-06-20", description: "Day to roll up (YYYY-MM-DD). Defaults to today." })
  @IsOptional()
  @IsISO8601()
  date?: string;
}
