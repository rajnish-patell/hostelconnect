import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ParentItem {
  id: string;
  name: string;
  phone: string;
  student: string;
  relationship: string;
  status: 'VERIFIED' | 'PENDING_APPROVAL';
  schoolCode: string;
}

@Injectable()
export class ParentsService {
  private fallbackParents: ParentItem[] = [
    { id: 'p1', name: 'Rajesh Sharma', phone: '+91 98765 43210', student: 'Aarav Sharma (STU-1001)', relationship: 'Father', status: 'VERIFIED', schoolCode: 'SCH-DAP' },
    { id: 'p2', name: 'Meenakshi Verma', phone: '+91 98123 45678', student: 'Ananya Verma (STU-1002)', relationship: 'Mother', status: 'VERIFIED', schoolCode: 'SCH-DAP' },
    { id: 'p3', name: 'Suresh Mehta', phone: '+91 99887 76655', student: 'Rohan Mehta (STU-1003)', relationship: 'Father', status: 'PENDING_APPROVAL', schoolCode: 'SCH-DAP' },
    { id: 'p4', name: 'Ramesh Nambiar', phone: '+91 98711 22334', student: 'Priya Nambiar (STU-1004)', relationship: 'Father', status: 'VERIFIED', schoolCode: 'SCH-DAP' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async findAll(schoolCode?: string): Promise<ParentItem[]> {
    if (schoolCode) {
      return this.fallbackParents.filter((p) => p.schoolCode.toUpperCase() === schoolCode.toUpperCase());
    }
    return this.fallbackParents;
  }

  async create(data: { name: string; phone: string; student: string; relationship?: string; schoolCode?: string }): Promise<ParentItem> {
    const newParent: ParentItem = {
      id: `p-${Date.now()}`,
      name: data.name.trim(),
      phone: data.phone.trim(),
      student: data.student.trim(),
      relationship: data.relationship || 'Guardian',
      status: 'VERIFIED',
      schoolCode: (data.schoolCode || 'SCH-DAP').toUpperCase(),
    };
    this.fallbackParents.unshift(newParent);
    return newParent;
  }

  async approve(id: string): Promise<ParentItem> {
    const parent = this.fallbackParents.find((p) => p.id === id);
    if (!parent) {
      throw new NotFoundException('Parent not found');
    }
    parent.status = 'VERIFIED';
    return parent;
  }
}
