import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class CreateBusDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Matches(/^[A-Z0-9-]{3,12}$/, { message: 'plateNumber must be 3–12 letters, digits or dashes' })
  plateNumber: string;

  @IsInt()
  @Min(4)
  @Max(80)
  capacity: number;

  @IsString()
  @Length(2, 80)
  driverName: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateBusDto extends PartialType(CreateBusDto) {}
