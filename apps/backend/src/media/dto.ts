import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from "class-validator";
import type { MediaType } from "@yes-boss/shared";

const TYPES: MediaType[] = ["photo", "video"];

export class UploadMediaDto {
  @ApiProperty({ enum: TYPES, example: "photo" })
  @IsIn(TYPES)
  type!: MediaType;

  @ApiProperty({ example: "IMG_20250620_103000.jpg" })
  @IsString()
  sourceFileName!: string;

  @ApiProperty({ example: "2025-06-20T10:30:00.000Z" })
  @IsISO8601()
  capturedAt!: string;

  @ApiProperty({ example: "sha256_abc123", description: "Stable device-side hash to prevent duplicate uploads" })
  @IsString()
  dedupeKey!: string;
}

export class ListMediaDto {
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

  @ApiPropertyOptional({ enum: TYPES, example: "photo" })
  @IsOptional()
  @IsIn(TYPES)
  type?: MediaType;
}
