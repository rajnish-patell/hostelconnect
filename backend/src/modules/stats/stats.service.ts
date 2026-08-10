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

    // Calculate real totals across active tenants
    const totalStudents = schools.reduce((acc, s) => acc + (s.students || 0), 0);
    const totalCalls = schools.reduce((acc, s) => acc + (s.callsMonth || 0), 0);

    // Calculate real MRR from active school plans
    const mrrAmount = schools
      .filter((s) => s.status === 'ACTIVE')
      .reduce((acc, s) => {
        const plan = (s.plan || '').toUpperCase();
        if (plan === 'ENTERPRISE') return acc + 79999;
        if (plan === 'PRO' || plan === 'PROFESSIONAL') return acc + 8999;
        return acc;
      }, 0);

    const formattedMrr = mrrAmount > 0 ? `₹${mrrAmount.toLocaleString('en-IN')}` : '₹0';

    return {
      totalTenants: schools.length,
      activeTenants: schools.filter((s) => s.status === 'ACTIVE').length,
      totalStudents,
      crossTenantCalls: totalCalls,
      platformMrr: formattedMrr,
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
