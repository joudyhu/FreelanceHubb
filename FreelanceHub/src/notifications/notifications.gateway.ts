import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/notifications', cors: { origin: (process.env.CORS_ORIGINS || '*').split(',') } })
export class NotificationsGateway {
  @WebSocketServer() server: Server;
  emitToUser(userId: number, event: string, payload: unknown) {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}
