import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class CallsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates school calling rules, parent wallet balance, and generates a LiveKit room token.
   */
  async initiateCall(studentId: string, parentId: string, tabletId?: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        school: {
          include: { callRules: true },
        },
      },
    });

    if (!student || !student.isActive) {
      throw new BadRequestException('Student account is inactive or not found');
    }

    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
      include: { user: { include: { wallet: true } } },
    });

    if (!parent || !parent.isApproved) {
      throw new BadRequestException('Parent guardian is not verified');
    }

    // 1. Verify link between student and parent
    const link = await this.prisma.studentParent.findUnique({
      where: {
        studentId_parentId: { studentId, parentId },
      },
    });

    if (!link || !link.callingAllowed) {
      throw new BadRequestException('Unauthorized: You can only call verified linked guardians.');
    }

    // 2. Check Wallet Balance
    const balance = parent.user.wallet ? Number(parent.user.wallet.balance) : 0;
    if (balance <= 0) {
      throw new BadRequestException('Insufficient wallet balance. Please recharge parent wallet.');
    }

    // 3. Check School Rules
    const rule = student.school.callRules[0];
    if (rule) {
      const todayDay = new Date().toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const allowedDays = rule.allowedDays as string[];
      if (allowedDays && allowedDays.length > 0 && !allowedDays.includes(todayDay)) {
        throw new BadRequestException(`Calling not permitted today (${todayDay}). Allowed days: ${allowedDays.join(', ')}`);
      }
    }

    // 4. Create Call Record
    const roomName = `hostelconnect_${student.schoolId}_${studentId}_${Date.now()}`;
    const call = await this.prisma.call.create({
      data: {
        schoolId: student.schoolId,
        studentId,
        parentId,
        tabletId,
        roomName,
        status: 'RINGING',
      },
    });

    // 5. Generate LiveKit Room Tokens
    const livekitApiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET || 'secretkeysecretkeysecretkeysecretkey';

    const atStudent = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: `student_${studentId}`,
      name: student.user.fullName,
      ttl: 60 * 30, // 30 mins
    });
    atStudent.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

    const atParent = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: `parent_${parentId}`,
      name: parent.user.fullName,
      ttl: 60 * 30,
    });
    atParent.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

    return {
      callId: call.id,
      roomName,
      studentToken: await atStudent.toJwt(),
      parentToken: await atParent.toJwt(),
      maxDurationMinutes: rule?.maxDurationMinutes || 15,
      costPerMinute: rule ? Number(rule.costPerMinute) : 2.0,
    };
  }

  async endCall(callId: string, durationSeconds: number, disconnectReason = 'USER_HANGUP') {
    const call = await this.prisma.call.findUnique({
      where: { id: callId },
      include: { school: { include: { callRules: true } }, parent: { include: { user: { include: { wallet: true } } } } },
    });

    if (!call) throw new NotFoundException('Call not found');

    const durationMinutes = Math.ceil(durationSeconds / 60);
    const ratePerMin = call.school.callRules[0] ? Number(call.school.callRules[0].costPerMinute) : 2.0;
    const totalCost = durationMinutes * ratePerMin;

    // Update Call Status
    const updatedCall = await this.prisma.call.update({
      where: { id: callId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        durationSeconds,
        costDeducted: totalCost,
        log: {
          create: {
            disconnectReason,
          },
        },
      },
    });

    // Deduct Wallet Balance
    if (call.parent.user.wallet && totalCost > 0) {
      await this.prisma.wallet.update({
        where: { id: call.parent.user.wallet.id },
        data: {
          balance: { decrement: totalCost },
          transactions: {
            create: {
              amount: totalCost,
              type: 'DEBIT_CALL',
              description: `Video Call Charge (${durationMinutes} min @ ₹${ratePerMin}/min)`,
              referenceId: call.id,
            },
          },
        },
      });
    }

    return updatedCall;
  }
}
