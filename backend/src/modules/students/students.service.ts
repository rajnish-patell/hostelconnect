import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface StudentItem {
  id: string;
  name: string;
  code: string;
  room: string;
  grade: string;
  status: 'Active' | 'Inactive';
  pin: string;
  parent: string;
  schoolCode: string;
}

@Injectable()
export class StudentsService {
  private fallbackStudents: StudentItem[] = [
    { id: '1', name: 'Aarav Sharma', code: 'STU-1001', room: 'A-204', grade: 'Grade 9-B', status: 'Active', pin: '4819', parent: 'Rajesh Sharma', schoolCode: 'SCH-DAP' },
    { id: '2', name: 'Ananya Verma', code: 'STU-1002', room: 'C-108', grade: 'Grade 10-A', status: 'Active', pin: '3920', parent: 'Meenakshi Verma', schoolCode: 'SCH-DAP' },
    { id: '3', name: 'Rohan Mehta', code: 'STU-1003', room: 'B-302', grade: 'Grade 8-C', status: 'Active', pin: '5192', parent: 'Suresh Mehta', schoolCode: 'SCH-DAP' },
    { id: '4', name: 'Priya Nambiar', code: 'STU-1004', room: 'C-215', grade: 'Grade 11-B', status: 'Active', pin: '9041', parent: 'Ramesh Nambiar', schoolCode: 'SCH-DAP' },
    { id: '5', name: 'Kabir Singhania', code: 'STU-2001', room: 'H-101', grade: 'Grade 10-B', status: 'Active', pin: '6712', parent: 'Dev Singhania', schoolCode: 'SCH-DHA' },
    { id: '6', name: 'Tara Deshmukh', code: 'STU-3001', room: 'M-201', grade: 'Grade 9-A', status: 'Active', pin: '8834', parent: 'Anil Deshmukh', schoolCode: 'SCH-MAYO' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async findAll(schoolCode?: string, search?: string): Promise<StudentItem[]> {
    let list = this.fallbackStudents;
    if (schoolCode) {
      list = list.filter((s) => s.schoolCode.toUpperCase() === schoolCode.toUpperCase());
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.room.toLowerCase().includes(q));
    }
    return list;
  }

  async create(data: { name: string; code: string; room?: string; grade?: string; schoolCode?: string; parent?: string }): Promise<StudentItem> {
    const code = data.code.trim().toUpperCase();
    const existing = this.fallbackStudents.find((s) => s.code === code);
    if (existing) {
      throw new ConflictException(`Student code ${code} already exists`);
    }

    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const newStudent: StudentItem = {
      id: `stu-${Date.now()}`,
      name: data.name.trim(),
      code,
      room: data.room || 'A-101',
      grade: data.grade || 'Grade 9-A',
      status: 'Active',
      pin,
      parent: data.parent || 'Verified Guardian',
      schoolCode: (data.schoolCode || 'SCH-DAP').toUpperCase(),
    };

    this.fallbackStudents.unshift(newStudent);
    return newStudent;
  }

  async resetPin(id: string): Promise<{ id: string; pin: string; name: string }> {
    const student = this.fallbackStudents.find((s) => s.id === id || s.code === id);
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    student.pin = newPin;
    return { id: student.id, name: student.name, pin: newPin };
  }

  async bulkImport(schoolCode: string, items?: Partial<StudentItem>[]): Promise<StudentItem[]> {
    const defaultBatch: Partial<StudentItem>[] = [
      { name: 'Vikramaditya Rao', code: `STU-${Math.floor(1000 + Math.random() * 9000)}`, room: 'B-104', grade: 'Grade 12-A', parent: 'Sanjay Rao' },
      { name: 'Kavya Sengupta', code: `STU-${Math.floor(1000 + Math.random() * 9000)}`, room: 'C-302', grade: 'Grade 10-C', parent: 'Anita Sengupta' },
    ];

    const toImport = items && items.length > 0 ? items : defaultBatch;
    const added: StudentItem[] = [];

    for (const item of toImport) {
      const pin = Math.floor(1000 + Math.random() * 9000).toString();
      const code = item.code?.toUpperCase() || `STU-${Date.now().toString().slice(-4)}`;
      const student: StudentItem = {
        id: `stu-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: item.name || 'Enrolled Student',
        code,
        room: item.room || 'A-101',
        grade: item.grade || 'Grade 9-B',
        status: 'Active',
        pin,
        parent: item.parent || 'Authorized Parent',
        schoolCode: (schoolCode || 'SCH-DAP').toUpperCase(),
      };
      this.fallbackStudents.unshift(student);
      added.push(student);
    }

    return added;
  }
}
