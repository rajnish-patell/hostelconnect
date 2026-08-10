import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ParentsService } from './parents.service';
import { Public } from '../../auth/public.decorator';

@Controller('parents')
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Public()
  @Get()
  async findAll(@Query('schoolCode') schoolCode?: string) {
    return this.parentsService.findAll(schoolCode);
  }

  @Public()
  @Post()
  async create(@Body() body: { name: string; phone: string; student: string; relationship?: string; schoolCode?: string }) {
    return this.parentsService.create(body);
  }

  @Public()
  @Patch(':id/approve')
  async approve(@Param('id') id: string) {
    return this.parentsService.approve(id);
  }
}
