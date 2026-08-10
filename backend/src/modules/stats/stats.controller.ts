import { Controller, Get, Query } from '@nestjs/common';
import { StatsService } from './stats.service';
import { Public } from '../../auth/public.decorator';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Public()
  @Get('overview')
  async getOverview(@Query('schoolCode') schoolCode?: string) {
    return this.statsService.getOverview(schoolCode);
  }
}
