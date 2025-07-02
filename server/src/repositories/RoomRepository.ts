import { v4 as uuidv4 } from "uuid";
import { Room, RoomStatus } from "../types/index.js";

/**
 * Simple in-memory storage for rooms
 * This will never be replaced with a database
 */
export class RoomRepository {
  private rooms = new Map<string, Room>();

  /**
   * Creates a new room and returns the roomId
   */
  create(adminName: string, adminIp: string): string {
    const roomId = uuidv4();
    const room: Room = {
      admin: { name: adminName, ip: adminIp },
      users: [],
      items: [],
      itemHistory: [],
      votes: {},
      status: RoomStatus.SETUP,
      bannedIps: [],
    };

    this.rooms.set(roomId, room);
    console.log(`Room created: ${roomId} by admin ${adminName} (${adminIp})`);

    return roomId;
  }

  /**
   * Gets a room by ID, returns undefined if not found
   */
  findById(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Updates a room
   */
  update(roomId: string, room: Room): void {
    this.rooms.set(roomId, room);
  }

  /**
   * Checks if a room exists
   */
  exists(roomId: string): boolean {
    return this.rooms.has(roomId);
  }
}
