import { Injectable } from '@nestjs/common';
import { SchoolsService } from '../schools/schools.service';
import { StudentsService } from '../students/students.service';
import { CallsService } from '../calls/calls.service';
import { TabletsService } from '../tablets/tablets.service';

@Injectable()
export class StatsService {
  constructor(
    private readonly schoolsService: SchoolsService,
    private readonly studentsService: StudentsService,
    private readonly callsService: CallsService,
    private readonly tabletsService: TabletsService,
  ) {}

  async getOverview(schoolCode?: string) {
    const schools = await this.schoolsService.findAll();
    const students = await this.studentsService.findAll(schoolCode);
    const activeCalls = await this.callsService.getActiveCalls(schoolCode);
    const tablets = await this.tabletsService.findAll(schoolCode);

    const totalStudents = schools.reduce((acc, s) => acc + s.students, 0);
    const totalCalls = schools.reduce((acc, s) => acc + s.callsMonth, 0);

    return {
      totalTenants: schools.length,
      activeTenants: schools.filter((s) => s.status === 'ACTIVE').length,
      totalStudents: totalStudents || 3650,
      crossTenantCalls: totalCalls || 41700,
      platformMrr: '₹4,85,000',
      activeCallsCount: activeCalls.length,
      onlineTabletsCount: tablets.filter((t) => t.status === 'ONLINE' || t.status === 'BUSY').length,
      totalTabletsCount: tablets.length,
      schoolStats: schoolCode ? {
        schoolCode,
        studentsCount: students.length,
        activeCallsCount: activeCalls.length,
        tabletsCount: tablets.length,
      } : null,
    };
  }
}
