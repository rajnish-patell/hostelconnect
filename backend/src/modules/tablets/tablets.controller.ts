import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TabletsService } from './tablets.service';
import { Public } from '../../auth/public.decorator';

@Controller('tablets')
export class TabletsController {
  constructor(private readonly tabletsService: TabletsService) {}

  @Public()
  @Get()
  async findAll(@Query('schoolCode') schoolCode?: string) {
    return this.tabletsService.findAll(schoolCode);
  }

  @Public()
  @Post()
  async create(@Body() body: { deviceId: string; name: string; block: string; schoolCode?: string }) {
    return this.tabletsService.create(body);
  }

  @Public()
  @Patch(':id/lock')
  async toggleLock(@Param('id') id: string) {
    return this.tabletsService.toggleLock(id);
  }
}
