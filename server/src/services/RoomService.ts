import { v4 as uuidv4 } from "uuid";
import { Room, User, Admin, RoomStatus, NotFoundError, ForbiddenError, BadRequestError } from "../types/index.js";

export class RoomService {
  private rooms = new Map<string, Room>();

  /**
   * Creates a new room with the given admin
   */
  createRoom(adminName: string, adminIp: string): string {
    if (!adminName) {
      throw new BadRequestError("Name is required");
    }

    const roomId = uuidv4();
    const room: Room = {
      admin: { name: adminName, ip: adminIp },
      users: [],
      items: [],
      itemHistory: [],
      status: RoomStatus.SETUP,
      bannedIps: [],
    };

    this.rooms.set(roomId, room);
    console.log(`Room created: ${roomId} by admin ${adminName} (${adminIp})`);

    return roomId;
  }

  /**
   * Gets a room by ID, throws if not found
   */
  getRoom(roomId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new NotFoundError("Room not found");
    }
    return room;
  }

  /**
   * Checks if a user is admin of a room
   */
  isAdmin(roomId: string, ip: string): boolean {
    try {
      const room = this.getRoom(roomId);
      return room.admin.ip === ip;
    } catch {
      return false;
    }
  }

  /**
   * Adds a user to a room or handles rejoin
   */
  joinRoom(
    roomId: string,
    userName: string,
    userIp: string
  ): {
    isAdmin: boolean;
    name: string;
    rejoin: boolean;
    roomState: { status: RoomStatus; currentItem: string | null };
  } {
    if (!userName || !roomId) {
      throw new BadRequestError("Name and roomId are required");
    }

    const room = this.getRoom(roomId);

    // Check if IP is banned
    if (room.bannedIps.includes(userIp)) {
      throw new ForbiddenError("You are banned from this room");
    }

    const roomState = {
      status: room.status,
      currentItem: room.items[0] || null,
    };

    // Admin rejoin
    if (room.admin.ip === userIp) {
      console.log(`Admin ${room.admin.name} (${userIp}) rejoined room ${roomId}`);
      return {
        isAdmin: true,
        name: room.admin.name,
        rejoin: true,
        roomState,
      };
    }

    // Player join/rejoin
    const existing = room.users.find((u) => u.ip === userIp);
    if (!existing) {
      room.users.push({ name: userName, ip: userIp });
      console.log(`User ${userName} (${userIp}) joined room ${roomId}`);
      return {
        isAdmin: false,
        name: userName,
        rejoin: false,
        roomState,
      };
    } else {
      console.log(`User ${existing.name} (${userIp}) rejoined room ${roomId}`);
      return {
        isAdmin: false,
        name: existing.name,
        rejoin: true,
        roomState,
      };
    }
  }

  /**
   * Gets all participants in a room
   */
  getParticipants(roomId: string): string[] {
    const room = this.getRoom(roomId);
    return [room.admin.name, ...room.users.map((u) => u.name)];
  }

  /**
   * Gets all players (participants) as User objects
   */
  getAllPlayers(room: Room): string[] {
    return [room.admin.name, ...room.users.map((u) => u.name)];
  }

  /**
   * Validates that a player is in the room
   */
  validatePlayerInRoom(room: Room, playerName: string): void {
    const players = this.getAllPlayers(room);
    if (!players.includes(playerName)) {
      throw new ForbiddenError("Player not in room");
    }
  }

  /**
   * Bans a user from a room
   * Admin validation should be done by middleware before calling this
   */
  banUser(roomId: string, userName: string): User {
    const room = this.getRoom(roomId);

    if (!userName) {
      throw new BadRequestError("userName is required");
    }

    if (userName === room.admin.name) {
      throw new BadRequestError("Cannot ban the admin");
    }

    const user = room.users.find((u) => u.name === userName);
    if (!user) {
      throw new NotFoundError("User not in room");
    }

    // Add IP to banned list
    room.bannedIps.push(user.ip);

    // Remove user from room
    room.users = room.users.filter((u) => u.name !== userName);

    return user;
  }

  /**
   * Sets items for a room
   * Admin validation should be done by middleware before calling this
   */
  setItems(roomId: string, items: string[]): void {
    const room = this.getRoom(roomId);

    if (!Array.isArray(items)) {
      throw new BadRequestError("Items must be an array");
    }

    room.items = items;
    room.status = RoomStatus.ITEMS_SUBMITTED;

    console.log(`Items set for room ${roomId}: ${items}`);
  }

  /**
   * Gets items for a room
   */
  getItems(roomId: string): string[] {
    const room = this.getRoom(roomId);
    return room.items;
  }

  /**
   * Gets room status information
   */
  getRoomStatus(roomId: string) {
    const room = this.getRoom(roomId);
    return {
      status: room.status,
      currentItem: room.items[0] || null,
      itemsRemaining: room.items.length,
      votesCount: Object.keys(room.votes || {}).length,
      totalPlayers: room.users.length + 1,
      completedItems: room.itemHistory.length,
    };
  }
}
