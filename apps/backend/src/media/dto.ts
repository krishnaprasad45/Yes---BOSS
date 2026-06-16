import { Type } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from "class-validator";
import type { MediaType } from "@yes-boss/shared";

const TYPES: MediaType[] = ["photo", "video"];

export class UploadMediaDto {
  @IsIn(TYPES)
  type!: MediaType;

  @IsString()
  sourceFileName!: string;

  @IsISO8601()
  capturedAt!: string;

  @IsString()
  dedupeKey!: string;
}

export class ListMediaDto {
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
  @IsIn(TYPES)
  type?: MediaType;
}
