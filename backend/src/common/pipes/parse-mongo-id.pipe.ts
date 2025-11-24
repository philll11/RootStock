import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseMongoIdPipe implements PipeTransform {
    transform(id: any, metadata: ArgumentMetadata) {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException(`${id} is not a valid MongoDB ObjectId`);
        }
        return id;
    }
}