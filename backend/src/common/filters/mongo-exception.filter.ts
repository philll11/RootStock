import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { MongoServerError } from 'mongodb';
import { MONGO_ERROR_CODES } from '../constants/mongo-error-codes';

@Catch(MongoServerError)
export class MongoExceptionFilter implements ExceptionFilter {
  catch(exception: MongoServerError, host: ArgumentsHost) {

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = HttpStatus.CONFLICT;

    switch (exception.code) {
      case MONGO_ERROR_CODES.DUPLICATE_KEY:
        const keyValue = exception.keyValue;
        const field = Object.keys(keyValue)[0];
        const value = Object.values(keyValue)[0];

        response.status(status).json({
          statusCode: status,
          message: `The value '${value}' for field '${field}' already exists.`,
          error: 'Conflict',
        });
        break;

      default:
        // For any other MongoServerError, send a generic 500
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'An internal database error occurred.',
          error: 'Internal Server Error',
        });
        break;
    }
  }
}
