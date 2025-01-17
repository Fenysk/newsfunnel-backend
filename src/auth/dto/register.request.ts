import { IsEmail, IsNotEmpty, IsString, IsStrongPassword } from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class RegisterRequest {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => value.toLowerCase())
    pseudo: string;

    @ApiProperty()
    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => value.toLowerCase())
    email: string;

    @ApiProperty()
    @IsString()
    @IsStrongPassword()
    @IsNotEmpty()
    password: string;
}
