import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';
import { OrchardsService } from './orchards.service';
import { Orchard, OrchardDocument } from './schemas/orchard.schema';
import { User } from '../users/schemas/user.schema';
import { CreateOrchardDto } from './dto/create-orchard.dto';
import { UpdateOrchardDto } from './dto/update-orchard.dto';
import { ClientResolverService } from '../clients/client-resolver/client-resolver.service';

jest.mock('./builders/orchards-query.builder');

describe('OrchardsService', () => {
  let service: OrchardsService;
  let orchardModel: Model<OrchardDocument>;

  const mockUser: User = {
    _id: 'user123',
    recordId: 'USER-001',
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'hashedpassword',
    roles: [],
    clientId: new Types.ObjectId('65a9a1a7b8e5c6e2f1f4a4c1'),
    isActive: true,
    isDeleted: false,
  } as any;
  const mockOrchardId = '65a9a1a7b8e5c6e2f1f4a4d4';
  const mockOrchard = {
    _id: new Types.ObjectId(mockOrchardId),
    recordId: 'ORCH-001',
    name: 'Test Orchard',
    clientId: new Types.ObjectId('65a9a1a7b8e5c6e2f1f4a4c1'),
  };
  const mockValidHexId1 = '65b9a1a7b8e5c6e2f1f4a4d5';
  const mockValidHexId2 = '65b9a1a7b8e5c6e2f1f4a4d6';

  const mockOrchardModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockClientResolverService = {
    getAccessibleClientIdsForSubsidiaryScope: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchardsService,
        { provide: getModelToken(Orchard.name), useValue: mockOrchardModel },
        { provide: ClientResolverService, useValue: mockClientResolverService },
      ],
    }).compile();

    service = module.get<OrchardsService>(OrchardsService);
    orchardModel = module.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreateOrchardDto = { recordId: 'ORCH-001', name: 'Test Orchard', clientId: '65a9a1a7b8e5c6e2f1f4a4c1' };

    it('should create an orchard using the static create method', async () => {
      (orchardModel.create as jest.Mock).mockResolvedValue(mockOrchard);
      const result = await service.create(createDto);
      expect(orchardModel.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockOrchard);
    });

    it('should propagate errors from the database on create', async () => {
      const dbError = new Error('DB save failed');
      (orchardModel.create as jest.Mock).mockRejectedValue(dbError);
      await expect(service.create(createDto)).rejects.toThrow(dbError);
    });
  });

  describe('findOne', () => {
    it('should find and return an orchard by ID', async () => {
      (orchardModel.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockOrchard),
      });
      const result = await service.findOne(mockOrchardId, mockUser);
      expect(result).toEqual(mockOrchard);
    });

    it('should throw a NotFoundException if orchard is not found', async () => {
      (orchardModel.findOne as jest.Mock).mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.findOne(mockOrchardId, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateOrchardDto = { name: 'Updated Name' };

    it('should update an existing orchard', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockOrchard as any);
      (orchardModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockOrchard, ...updateDto }),
      });

      const result = await service.update(mockOrchardId, updateDto, mockUser);
      expect(result.name).toEqual('Updated Name');
    });

    it('should throw NotFoundException if findByIdAndUpdate returns null', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockOrchard as any);
      (orchardModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.update(mockOrchardId, updateDto, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft-delete an existing orchard', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockOrchard as any);
      (orchardModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockOrchard, isDeleted: true }),
      });
      const result = await service.remove(mockOrchardId, mockUser);
      expect(result.isDeleted).toBe(true);
    });
  });

  describe('validateOrchardIds', () => {
    it('should return true for a valid list of IDs', async () => {
      // FIX: Use valid 24-character hex strings for IDs
      const ids = [mockValidHexId1, mockValidHexId2];
      (orchardModel.countDocuments as jest.Mock).mockResolvedValue(2);
      const result = await service.validateOrchardIds(ids);
      expect(result).toBe(true);
    });

    it('should return false if the count does not match', async () => {
      // FIX: Use valid 24-character hex strings for IDs
      const ids = [mockValidHexId1, '65b9a1a7b8e5c6e2f1f4a4d7'];
      (orchardModel.countDocuments as jest.Mock).mockResolvedValue(1);
      const result = await service.validateOrchardIds(ids);
      expect(result).toBe(false);
    });

    it('should return true for an empty array', async () => {
      const result = await service.validateOrchardIds([]);
      expect(result).toBe(true);
      expect(orchardModel.countDocuments).not.toHaveBeenCalled();
    });

    it('should return true for a null or undefined array', async () => {
      expect(await service.validateOrchardIds(null as any)).toBe(true);
      expect(await service.validateOrchardIds(undefined as any)).toBe(true);
      expect(orchardModel.countDocuments).not.toHaveBeenCalled();
    });
  });
});