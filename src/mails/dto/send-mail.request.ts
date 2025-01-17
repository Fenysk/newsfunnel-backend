import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SendMailRequestDto {
    @IsEmail()
    @IsNotEmpty()
    to: string;

    @IsString()
    @IsNotEmpty()
    subject: string;

    @IsString()
    @IsNotEmpty()
    html: string;
}
