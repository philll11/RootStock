// backend/src/counters/counters.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Counter, CounterDocument } from './schemas/counter.schema';
import { UpdateCounterDto } from './dto/update-counter.dto';

@Injectable()
export class CountersService {
  constructor(
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
  ) { }

  /**
   * Retrieves all counter documents from the database.
   * @returns A promise that resolves to an array of all counters.
   */
  async findAll(): Promise<Counter[]> {
    return this.counterModel.find().exec();
  }

  /**
   * Updates the prefix for a specific counter.
   * @param counterId The internal ID of the counter to update (e.g., 'subsidiary').
   * @param updateCounterDto The DTO containing the new prefix.
   * @returns A promise that resolves to the updated counter document.
   */
  async update(counterId: string, updateCounterDto: UpdateCounterDto): Promise<Counter> {
    const updatedCounter = await this.counterModel.findOneAndUpdate(
      { _id: counterId, __v: updateCounterDto.__v },
      { $set: { prefix: updateCounterDto.prefix }, $inc: { __v: 1 } },
      { new: true },
    ).exec();

    if (!updatedCounter) {
      const exists = await this.counterModel.exists({ _id: counterId });
      if (exists) {
          throw new ConflictException('The record has been modified by another user. Please refresh and try again.');
      } else {
          throw new NotFoundException(`Counter with ID "${counterId}" not found.`);
      }
    }

    return updatedCounter;
  }


  /**
   * Atomically finds a counter document, increments its sequence value, and returns the updated document.
   * If the counter does not exist, it creates it with the provided default prefix and a sequence of 1.
   * @param sequenceName The name of the sequence (e.g., 'subsidiary').
   * @param defaultPrefix The default prefix to use if the counter is created (e.g., 'SUB').
   * @returns A promise that resolves to the counter document with the new sequence value and prefix.
   */
  async getNextSequenceValue(sequenceName: string, defaultPrefix: string): Promise<Counter> {
    const counter = await this.counterModel.findOneAndUpdate(
      { _id: sequenceName },
      {
        $inc: { sequence_value: 1 },
        $setOnInsert: { prefix: defaultPrefix },
      },
      { returnDocument: 'after', upsert: true, new: true },
    ).exec();

    return counter;
  }
}