import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { CallsService } from './calls.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'calls',
})
export class CallsGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly callsService: CallsService) {}

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string; role: string },
  ) {
    client.join(`user_${payload.userId}`);
    console.log(`⚡ WebSocket client ${client.id} joined room user_${payload.userId}`);
    return { status: 'joined', userId: payload.userId };
  }

  @SubscribeMessage('initiate_call_signal')
  async handleInitiateCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { studentId: string; parentId: string; tabletId?: string },
  ) {
    try {
      const callData = await this.callsService.initiateCall(
        payload.studentId,
        payload.parentId,
        payload.tabletId,
      );

      // Emit incoming call event to parent socket
      this.server.to(`user_${payload.parentId}`).emit('incoming_call', {
        callId: callData.callId,
        roomName: callData.roomName,
        parentToken: callData.parentToken,
        studentId: payload.studentId,
        maxDurationMinutes: callData.maxDurationMinutes,
      });

      return { success: true, data: callData };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  @SubscribeMessage('accept_call')
  handleAcceptCall(
    @MessageBody() payload: { callId: string; studentId: string },
  ) {
    this.server.to(`user_${payload.studentId}`).emit('call_accepted', {
      callId: payload.callId,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('reject_call')
  handleRejectCall(
    @MessageBody() payload: { callId: string; studentId: string; reason?: string },
  ) {
    this.server.to(`user_${payload.studentId}`).emit('call_rejected', {
      callId: payload.callId,
      reason: payload.reason || 'Parent unavailable',
    });
  }

  @SubscribeMessage('end_call')
  async handleEndCall(
    @MessageBody() payload: { callId: string; durationSeconds: number; reason?: string },
  ) {
    const callResult = await this.callsService.endCall(
      payload.callId,
      payload.durationSeconds,
      payload.reason || 'USER_HANGUP',
    );

    this.server.emit(`call_ended_${payload.callId}`, {
      callId: payload.callId,
      durationSeconds: payload.durationSeconds,
      costDeducted: callResult.costDeducted,
    });

    return { success: true, callResult };
  }
}
