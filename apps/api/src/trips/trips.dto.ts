import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsString, IsUUID, Length, Matches } from 'class-validator';
import { TripDirection } from '../generated/prisma/enums.js';

export class CreateTripDto {
  @IsString()
  @Length(2, 80)
  name: string;

  @IsEnum(TripDirection)
  direction: TripDirection;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'departureTime must be HH:mm' })
  departureTime: string;

  @IsUUID()
  busId: string;
}

export class UpdateTripDto extends PartialType(CreateTripDto) {}
