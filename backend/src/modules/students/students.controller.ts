import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { StudentsService } from './students.service';
import { Public } from '../../auth/public.decorator';

@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Public()
  @Get()
  async findAll(
    @Query('schoolCode') schoolCode?: string,
    @Query('search') search?: string,
  ) {
    return this.studentsService.findAll(schoolCode, search);
  }

  @Public()
  @Post()
  async create(@Body() body: { name: string; code: string; room?: string; grade?: string; schoolCode?: string; parent?: string }) {
    return this.studentsService.create(body);
  }

  @Public()
  @Post(':id/reset-pin')
  async resetPin(@Param('id') id: string) {
    return this.studentsService.resetPin(id);
  }

  @Public()
  @Post('import-excel')
  async bulkImport(@Body() body: { schoolCode: string; items?: any[] }) {
    return this.studentsService.bulkImport(body.schoolCode, body.items);
  }
}
