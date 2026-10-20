import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators.js';
import { CreateTripDto, UpdateTripDto } from './trips.dto.js';
import { TripsService } from './trips.service.js';

@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  /** Any signed-in user: parents pick a trip when subscribing. */
  @Get()
  findAll() {
    return this.trips.findAll();
  }

  @Post()
  @Roles('OPERATOR')
  create(@Body() dto: CreateTripDto) {
    return this.trips.create(dto);
  }

  @Patch(':id')
  @Roles('OPERATOR')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTripDto) {
    return this.trips.update(id, dto);
  }

  @Delete(':id')
  @Roles('OPERATOR')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.trips.remove(id);
  }
}
