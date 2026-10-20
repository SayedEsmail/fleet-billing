import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Roles } from '../auth/decorators.js';
import { CreateBusDto, UpdateBusDto } from './buses.dto.js';
import { BusesService } from './buses.service.js';

@Controller('buses')
@Roles('OPERATOR')
export class BusesController {
  constructor(private readonly buses: BusesService) {}

  @Get()
  findAll() {
    return this.buses.findAll();
  }

  @Post()
  create(@Body() dto: CreateBusDto) {
    return this.buses.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBusDto) {
    return this.buses.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.buses.remove(id);
  }
}
