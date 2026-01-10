import { IsDefined } from 'class-validator';

export class UpdateSystemConfigDto {
  @IsDefined()
  value: any;
}
