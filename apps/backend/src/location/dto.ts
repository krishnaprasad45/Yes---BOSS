import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

export class LocationPointDto {
  @ApiProperty({ example: 12.9716, description: "Latitude (-90 to 90)" })
  @IsLatitude()
  lat!: number;

  @ApiProperty({ example: 77.5946, description: "Longitude (-180 to 180)" })
  @IsLongitude()
  lng!: number;

  @ApiProperty({ example: "2025-06-20T10:30:00.000Z" })
  @IsISO8601()
  recordedAt!: string;

  @ApiProperty({ example: "12.9716_77.5946_1750420200000", description: "Stable device-side hash for dedupe" })
  @IsString()
  dedupeKey!: string;
}

export class SyncLocationDto {
  @ApiProperty({ type: [LocationPointDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationPointDto)
  points!: LocationPointDto[];
}

export class DistanceQueryDto {
  @ApiPropertyOptional({ example: "2025-06-01T00:00:00.000Z" })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: "2025-06-30T23:59:59.000Z" })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
