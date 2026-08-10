import { Controller, Get, Post, Put, Patch, Delete, Body, Param } from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { Public } from '../../auth/public.decorator';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Public()
  @Get()
  async getAll() {
    return this.schoolsService.findAll();
  }

  @Public()
  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.schoolsService.findOne(id);
  }

  @Public()
  @Post()
  async create(@Body() data: { name: string; code: string; plan?: string }) {
    return this.schoolsService.create(data);
  }

  @Public()
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: { name?: string; code?: string; plan?: string; status?: 'ACTIVE' | 'SUSPENDED' }) {
    return this.schoolsService.update(id, data);
  }

  @Public()
  @Patch(':id/plan')
  async updatePlan(@Param('id') id: string, @Body() data: { plan: string }) {
    return this.schoolsService.updatePlan(id, data.plan);
  }

  @Public()
  @Patch(':id/status')
  async toggleStatus(@Param('id') id: string) {
    return this.schoolsService.toggleStatus(id);
  }

  @Public()
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.schoolsService.delete(id);
  }
}
