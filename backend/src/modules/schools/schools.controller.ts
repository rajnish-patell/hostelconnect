import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { Public } from '../../auth/public.decorator';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Public()
  @Get()
  async findAll() {
    return this.schoolsService.findAll();
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.schoolsService.findOne(id);
  }

  @Public()
  @Post()
  async create(@Body() body: { name: string; code: string; plan?: string }) {
    return this.schoolsService.create(body);
  }

  @Public()
  @Patch(':id/status')
  async toggleStatus(@Param('id') id: string) {
    return this.schoolsService.toggleStatus(id);
  }
}
