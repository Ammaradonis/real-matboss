import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Module } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: true,
    credentials: true,
  },
})
@Injectable()
export class BookingGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('subscribe.provider')
  subscribeProvider(
    @MessageBody() payload: { providerId: string },
    client: Socket,
  ): { ok: true } {
    client.join(`provider:${payload.providerId}`);
    return { ok: true };
  }

  emitBookingCreated(providerId: string, payload: unknown): void {
    this.server.to(`provider:${providerId}`).emit('booking.created', payload);
  }

  emitBookingConfirmed(providerId: string, payload: unknown): void {
    this.server.to(`provider:${providerId}`).emit('booking.confirmed', payload);
  }

  emitBookingCancelled(providerId: string, payload: unknown): void {
    this.server.to(`provider:${providerId}`).emit('booking.cancelled', payload);
  }

  emitAvailabilityChanged(providerId: string, payload: unknown): void {
    this.server.to(`provider:${providerId}`).emit('availability.changed', payload);
  }
}

@Module({
  providers: [BookingGateway],
  exports: [BookingGateway],
})
export class WebsocketModule {}
