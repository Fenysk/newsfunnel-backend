import { IsEmail, IsString, IsNumber, IsBoolean, IsNotEmpty } from "class-validator";

export class LinkMailsRequestDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsEmail()
    @IsNotEmpty()
    user: string;

    @IsString()
    @IsNotEmpty()
    password: string;

    @IsString()
    @IsNotEmpty()
    host: string;

    @IsNumber()
    @IsNotEmpty()
    port: number;

    @IsBoolean()
    @IsNotEmpty()
    tls: boolean;
}