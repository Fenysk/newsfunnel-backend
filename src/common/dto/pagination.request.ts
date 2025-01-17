import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsInt } from "class-validator";
import { Transform, Type } from "class-transformer";

export class PaginationRequest {
    @ApiProperty({ required: false, description: 'Page number for pagination', default: 1 })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Transform(({ value }) => parseInt(value))
    page: number = 1;

    @ApiProperty({ required: false, description: 'Number of items per page', default: 10 })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @Transform(({ value }) => parseInt(value))
    limit: number = 10;
}
