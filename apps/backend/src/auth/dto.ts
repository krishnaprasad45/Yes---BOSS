import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "boss@example.com", description: "Account email" })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: "SuperSecret1" })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RefreshDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  @IsString()
  refreshToken: string;
}
