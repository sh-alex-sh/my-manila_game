import { io, type Socket } from 'socket.io-client';

let socket: Socket | null = null;
let yourPlayerId: string | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io();
  }
  return socket;
}

export function setSocketYourPlayerId(id: string | null): void {
  yourPlayerId = id;
}

export function getSocketYourPlayerId(): string | null {
  return yourPlayerId;
}
