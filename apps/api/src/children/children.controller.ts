import { Body, Controller, Get, Post } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';
import { type AuthUser, CurrentUser, Roles } from '../auth/decorators.js';
import { PrismaService } from '../prisma/prisma.service.js';

class CreateChildDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 60)
  name: string;

  @IsInt()
  @Min(1)
  @Max(12)
  grade: number;
}

/** A parent's own children. Always scoped by the authenticated user id. */
@Controller('children')
@Roles('PARENT')
export class ChildrenController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.prisma.child.findMany({
      where: { parentId: user.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, grade: true },
    });
  }

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateChildDto) {
    return this.prisma.child.create({
      data: { ...dto, parentId: user.id },
      select: { id: true, name: true, grade: true },
    });
  }
}
