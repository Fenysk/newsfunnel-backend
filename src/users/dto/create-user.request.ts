import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateUserRequest {
    @IsString()
    @IsNotEmpty()
    pseudo: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsOptional()
    hashedPassword?: string;
}
