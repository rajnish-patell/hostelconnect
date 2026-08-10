import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessToken } from 'livekit-server-sdk';

export interface ActiveCallItem {
  id: string;
  studentName: string;
  parentName: string;
  hostelBlock: string;
  tabletDevice: string;
  startTime: string;
  duration: string;
  schoolCode: string;
}

@Injectable()
export class CallsService {
  private readonly logger = new Logger(CallsService.name);
  private memoryActiveCalls = new Map<string, ActiveCallItem>();

  constructor(private readonly prisma: PrismaService) {}

  async getActiveCalls(schoolCode?: string): Promise<ActiveCallItem[]> {
    try {
      const dbCalls = await this.prisma.call.findMany({
        where: {
          status: { in: ['RINGING', 'CONNECTED'] },
          ...(schoolCode && { school: { code: schoolCode.toUpperCase() } }),
        },
        include: {
          student: { include: { user: true } },
          parent: { include: { user: true } },
          tablet: true,
          school: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (dbCalls && dbCalls.length > 0) {
        return dbCalls.map((c) => ({
          id: c.id,
          studentName: c.student.user.fullName,
          parentName: c.parent.user.fullName,
          hostelBlock: c.tablet?.hostelBlock || 'Main Block',
          tabletDevice: c.tablet?.deviceName || 'Hostel Kiosk',
          startTime: c.startedAt ? new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
          duration: '01:00',
          schoolCode: c.school.code,
        }));
      }
    } catch (e) {
      this.logger.debug(`Prisma getActiveCalls fallback: ${e}`);
    }

    const list = Array.from(this.memoryActiveCalls.values());
    if (schoolCode) {
      return list.filter((c) => c.schoolCode.toUpperCase() === schoolCode.toUpperCase());
    }
    return list;
  }

  async getCallHistory(schoolCode?: string) {
    try {
      const calls = await this.prisma.call.findMany({
        where: {
          status: 'COMPLETED',
          ...(schoolCode && { school: { code: schoolCode.toUpperCase() } }),
        },
        include: {
          student: { include: { user: true } },
          parent: { include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });

      if (calls && calls.length > 0) {
        return calls.map((c) => ({
          id: c.id,
          studentName: c.student.user.fullName,
          parentName: c.parent.user.fullName,
          durationSeconds: c.durationSeconds,
          costDeducted: Number(c.costDeducted),
          status: c.status,
          date: c.createdAt,
        }));
      }
    } catch (e) {
      // Ignored for fallback
    }

    return [];
  }

  async initiateCall(studentId: string, parentId: string, tabletId?: string, schoolCode = 'SCH-DAP') {
    const newCallId = `call-${Date.now().toString().slice(-6)}`;
    const studentName = studentId.startsWith('STU') || studentId.includes(' ') ? studentId : 'Aarav Sharma';
    const parentName = parentId.startsWith('p') || parentId.includes(' ') ? parentId : 'Rajesh Sharma';

    const activeCall: ActiveCallItem = {
      id: newCallId,
      studentName,
      parentName,
      hostelBlock: 'Block A (Boys)',
      tabletDevice: tabletId || 'Tablet-A01',
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      duration: '00:01',
      schoolCode: schoolCode.toUpperCase(),
    };

    this.memoryActiveCalls.set(newCallId, activeCall);

    const roomName = `room_${schoolCode}_${studentName.toLowerCase().replace(/\s+/g, '')}_${newCallId}`;
    const livekitApiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET || 'secretkeysecretkeysecretkeysecretkey';

    let studentToken = 'mock_student_jwt_token';
    let parentToken = 'mock_parent_jwt_token';

    try {
      const atStudent = new AccessToken(livekitApiKey, livekitApiSecret, {
        identity: `student_${studentId}`,
        name: studentName,
        ttl: 60 * 30,
      });
      atStudent.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
      studentToken = await atStudent.toJwt();

      const atParent = new AccessToken(livekitApiKey, livekitApiSecret, {
        identity: `parent_${parentId}`,
        name: parentName,
        ttl: 60 * 30,
      });
      atParent.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });
      parentToken = await atParent.toJwt();
    } catch (e) {
      // Fallback tokens
    }

    return {
      callId: newCallId,
      roomName,
      studentToken,
      parentToken,
      maxDurationMinutes: 15,
      costPerMinute: 2.0,
      studentName,
      parentName,
      hostelBlock: 'Block A (Boys)',
    };
  }

  async endCall(callId: string, durationSeconds = 0, disconnectReason = 'USER_HANGUP') {
    this.memoryActiveCalls.delete(callId);
    return {
      callId,
      status: 'COMPLETED',
      durationSeconds,
      costDeducted: Math.ceil(durationSeconds / 60) * 2.0,
      disconnectReason,
    };
  }
}
