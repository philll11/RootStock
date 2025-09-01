import { IsArray, IsMongoId, IsString } from 'class-validator';

export class AssignUsersDto {
    @IsArray()
    @IsString({ each: true })
    @IsMongoId({ each: true })
    userIds: string[];
}