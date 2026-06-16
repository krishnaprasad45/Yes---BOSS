import { IsISO8601, IsOptional } from "class-validator";

export class RangeQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class DigestQueryDto {
  /** Day to roll up (YYYY-MM-DD or full ISO). Defaults to today. */
  @IsOptional()
  @IsISO8601()
  date?: string;
}
