import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/decorators.js';
import { StatsService } from './stats.service.js';

@Controller('stats')
@Roles('OPERATOR')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  overview() {
    return this.stats.overview();
  }
}
