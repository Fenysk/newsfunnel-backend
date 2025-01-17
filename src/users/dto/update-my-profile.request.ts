import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class UpdateMyProfileRequest {
    @ApiProperty({ required: false })
    @IsOptional()
    @Matches(/^[\w-]+$/, {
        message: 'Le pseudo ne doit contenir que des lettres, chiffres, tirets et underscores'
    })
    @IsString()
    @MaxLength(30)
    pseudo?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    displayName?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    biography?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUrl()
    @MaxLength(200)
    link?: string;

    @ApiProperty({ required: false })
    @IsOptional()
    @IsUrl()
    @MaxLength(500)
    avatarUrl?: string;
}

