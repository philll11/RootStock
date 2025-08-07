import { IsBoolean, IsMongoId, IsOptional, IsString } from 'class-validator';

export class QueryClientDto {

    @IsString()
    @IsOptional()
    readonly name?: string;

    @IsString()
    @IsOptional()
    readonly recordId?: string;

    @IsMongoId()
    @IsOptional()
    readonly subsidiaryId?: string;
    
    @IsBoolean()
    @IsOptional()
    readonly isDeleted?: boolean;

    @IsBoolean()
    @IsOptional()
    readonly includeInactives?: boolean;
}