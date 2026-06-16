import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class UpdateAutoReplyDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(320)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  signature?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  cooldownMinutes?: number;
}
