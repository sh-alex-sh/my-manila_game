import { Room, type RoomInfo } from './Room.js';

export class RoomManager {
  private static rooms: Map<string, Room> = new Map();

  static generateId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id: string;
    do {
      id = '';
      for (let i = 0; i < 6; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
      }
    } while (this.rooms.has(id));
    return id;
  }

  static create(
    name: string,
    hostSocketId: string,
    hostPlayerId: string,
    hostName: string,
    maxPlayers: number,
  ): Room {
    const id = this.generateId();
    const room = new Room(id, name, hostSocketId, hostPlayerId, hostName, maxPlayers);
    this.rooms.set(id, room);
    return room;
  }

  static get(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  static remove(id: string): void {
    this.rooms.delete(id);
  }

  static listAvailable(): RoomInfo[] {
    const list: RoomInfo[] = [];
    for (const room of this.rooms.values()) {
      if (room.getState() === 'waiting') {
        list.push(room.getInfo());
      }
    }
    return list;
  }

  static getRoomBySocket(socketId: string): Room | null {
    for (const room of this.rooms.values()) {
      if (room.getSocketIds().includes(socketId)) {
        return room;
      }
    }
    return null;
  }
}
