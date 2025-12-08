import { IsEnum, IsOptional } from 'class-validator';

export class UserPreferencesDto {
    @IsEnum(['light', 'dark', 'auto'])
    @IsOptional()
    theme?: 'light' | 'dark' | 'auto';
}
