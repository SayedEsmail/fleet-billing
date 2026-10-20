import { Injectable } from '@nestjs/common';
import { mapPrismaError } from '../common/prisma-errors.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTripDto, UpdateTripDto } from './trips.dto.js';

const errors = { inUse: 'Trip has subscriptions or the bus does not exist' };

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.trip.findMany({
      orderBy: [{ direction: 'asc' }, { departureTime: 'asc' }],
      include: { bus: { select: { id: true, plateNumber: true, capacity: true } } },
    });
  }

  async create(dto: CreateTripDto) {
    try {
      return await this.prisma.trip.create({ data: dto });
    } catch (e) {
      throw mapPrismaError(e, 'Trip', errors);
    }
  }

  async update(id: string, dto: UpdateTripDto) {
    try {
      return await this.prisma.trip.update({ where: { id }, data: dto });
    } catch (e) {
      throw mapPrismaError(e, 'Trip', errors);
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.trip.delete({ where: { id } });
    } catch (e) {
      throw mapPrismaError(e, 'Trip', errors);
    }
  }
}
