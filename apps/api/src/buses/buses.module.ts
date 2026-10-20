import { Module } from '@nestjs/common';
import { BusesController } from './buses.controller.js';
import { BusesService } from './buses.service.js';

@Module({
  controllers: [BusesController],
  providers: [BusesService],
})
export class BusesModule {}
