import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CreateTripDto, UpdateTripDto } from './trips.dto.js';
import { TripsService } from './trips.service.js';

@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  findAll() {
    return this.trips.findAll();
  }

  @Post()
  create(@Body() dto: CreateTripDto) {
    return this.trips.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTripDto) {
    return this.trips.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.trips.remove(id);
  }
}
