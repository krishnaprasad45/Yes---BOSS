import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PaginationMeta {
  @ApiProperty({ example: 42 }) itemCount: number;
  @ApiProperty({ example: 5 }) pageCount: number;
  @ApiProperty({ example: 1 }) currentPage: number;
  @ApiProperty({ example: true }) hasNextPage: boolean;
}

export class SuccessResponseDto {
  @ApiProperty({ type: "object", additionalProperties: true, description: "Response payload" }) data: unknown;
  @ApiProperty({ example: "Operation successful" }) message: string;
  @ApiProperty({ example: "success" }) status: string;
  @ApiProperty({ example: 200 }) statusCode: number;
}

export class PaginatedResponseDto {
  @ApiProperty({ type: "array", items: { type: "object", additionalProperties: true }, description: "Array of items" }) data: unknown[];
  @ApiProperty({ type: () => PaginationMeta }) pagination: PaginationMeta;
  @ApiProperty({ example: "OK" }) message: string;
}

export class ErrorResponseDto {
  @ApiPropertyOptional({ type: "object", additionalProperties: true, nullable: true, example: null }) data: null;
  @ApiProperty({ example: "Validation failed" }) message: string;
  @ApiProperty({ example: "error" }) status: string;
  @ApiProperty({ example: 400 }) statusCode: number;
}
