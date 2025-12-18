import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Variety, VarietyDocument } from './schemas/variety.schema';
import { CreateVarietyDto } from './dto/create-variety.dto';
import { UpdateVarietyDto } from './dto/update-variety.dto';
import { VarietyQueryDto } from './dto/variety-query.dto';
import { CountersService } from '../../system/counters/counters.service';
import { ClientResolverService } from '../../iam/client-resolver/client-resolver.service';
import { UserDocument } from '../../iam/users/schemas/user.schema';
import { VarietyQueryBuilder } from './builders/variety-query.builder';

@Injectable()
export class VarietiesService {
  constructor(
    @InjectModel(Variety.name) private varietyModel: Model<VarietyDocument>,
    private readonly countersService: CountersService,
    private readonly clientResolverService: ClientResolverService,
  ) {}

  async create(createVarietyDto: CreateVarietyDto, requestingUser: UserDocument): Promise<Variety> {
    // Check for case-insensitive uniqueness
    const existingVariety = await this.varietyModel.findOne({
      name: { $regex: new RegExp(`^${createVarietyDto.name}$`, 'i') },
    }).exec();

    if (existingVariety) {
      throw new ConflictException(`Variety with name "${createVarietyDto.name}" already exists.`);
    }

    const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('variety', 'VAR');
    const recordId = `${prefix}${sequence_value.toString().padStart(3, '0')}`;

    const createdVariety = new this.varietyModel({
      ...createVarietyDto,
      recordId,
    });
    return createdVariety.save();
  }

  async findAll(query: VarietyQueryDto, requestingUser: UserDocument): Promise<Variety[]> {
    const queryBuilder = new VarietyQueryBuilder(query, requestingUser, this.clientResolverService);
    const filter = await queryBuilder.build();
    return this.varietyModel.find(filter).sort({ name: 1 }).exec();
  }

  async findOne(id: string, requestingUser: UserDocument): Promise<Variety> {
    // Use the builder to ensure security scope is applied even for single fetches
    const queryBuilder = new VarietyQueryBuilder({}, requestingUser, this.clientResolverService);
    const filter = await queryBuilder.build();
    filter._id = id;

    const variety = await this.varietyModel.findOne(filter).exec();
    if (!variety) {
      throw new NotFoundException(`Variety with ID "${id}" not found`);
    }
    return variety;
  }

  async update(id: string, updateVarietyDto: UpdateVarietyDto, requestingUser: UserDocument): Promise<Variety> {
    if (updateVarietyDto.name) {
       const existingVariety = await this.varietyModel.findOne({
        name: { $regex: new RegExp(`^${updateVarietyDto.name}$`, 'i') },
        _id: { $ne: id }
      }).exec();

      if (existingVariety) {
        throw new ConflictException(`Variety with name "${updateVarietyDto.name}" already exists.`);
      }
    }

    // Optimistic Concurrency Control
    const query: any = { _id: id };
    if (updateVarietyDto.__v !== undefined) {
      query.__v = updateVarietyDto.__v;
    }

    const updatedVariety = await this.varietyModel
      .findOneAndUpdate(query, updateVarietyDto, { new: true })
      .exec();

    if (!updatedVariety) {
      // If update fails, check if it was due to version mismatch or ID not found
      const exists = await this.varietyModel.exists({ _id: id });
      if (exists) {
        throw new ConflictException('The record has been modified by another user. Please refresh and try again.');
      }
      throw new NotFoundException(`Variety with ID "${id}" not found`);
    }
    return updatedVariety;
  }

  async remove(id: string, requestingUser: UserDocument): Promise<Variety> {
    // TODO: Check if variety is used in any active Blocks before deleting
    // NOTE: Block entity is not yet implemented. This check must be added when Blocks are implemented.

    const deletedVariety = await this.varietyModel
      .findByIdAndUpdate(id, { isDeleted: true, isActive: false }, { new: true })
      .exec();

    if (!deletedVariety) {
      throw new NotFoundException(`Variety with ID "${id}" not found`);
    }
    return deletedVariety;
  }

  /**
   * Validates if a variety exists, is active, and is not deleted.
   * @param id The variety ID to check.
   * @returns true if valid, false otherwise.
   */
  async validateVarietyId(id: string): Promise<boolean> {
    const variety = await this.varietyModel.findOne({
      _id: id,
      isActive: true,
      isDeleted: false,
    }).exec();
    return !!variety;
  }
}
