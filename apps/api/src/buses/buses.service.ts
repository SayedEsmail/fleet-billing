import { Injectable } from '@nestjs/common';
import { mapPrismaError } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateBusDto, UpdateBusDto } from './buses.dto.js';

const errors = { unique: 'A bus with this plate number already exists', inUse: 'Bus is still assigned to trips' };

@Injectable()
export class BusesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.bus.findMany({
      orderBy: { plateNumber: 'asc' },
      include: { _count: { select: { trips: true } } },
    });
  }

  async create(dto: CreateBusDto) {
    try {
      return await this.prisma.bus.create({ data: dto });
    } catch (e) {
      throw mapPrismaError(e, 'Bus', errors);
    }
  }

  async update(id: string, dto: UpdateBusDto) {
    try {
      return await this.prisma.bus.update({ where: { id }, data: dto });
    } catch (e) {
      throw mapPrismaError(e, 'Bus', errors);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.bus.delete({ where: { id } });
    } catch (e) {
      throw mapPrismaError(e, 'Bus', errors);
    }
  }
}
