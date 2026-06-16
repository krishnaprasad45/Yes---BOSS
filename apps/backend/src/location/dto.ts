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
  @IsLatitude()
  lat!: number;

  @IsLongitude()
  lng!: number;

  @IsISO8601()
  recordedAt!: string;

  @IsString()
  dedupeKey!: string;
}

export class SyncLocationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationPointDto)
  points!: LocationPointDto[];
}

export class DistanceQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
