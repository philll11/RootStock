import { Test, TestingModule } from '@nestjs/testing';
import { OrchardsController } from './orchards.controller';
import { OrchardsService } from './orchards.service';

describe('OrchardsController', () => {
  let controller: OrchardsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrchardsController],
      providers: [OrchardsService],
    }).compile();

    controller = module.get<OrchardsController>(OrchardsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
