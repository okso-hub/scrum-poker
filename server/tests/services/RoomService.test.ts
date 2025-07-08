// tests/roomService.spec.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RoomService } from '../../src/services/RoomService.js';
import {
  RoomStatus,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  User,
} from '../../src/types/index.js';

describe('RoomService', () => {
  let svc: RoomService;
  const ADMIN_NAME = 'alice';
  const ADMIN_IP = '1.1.1.1';
  const ROOM_ID = 654321;

  beforeEach(() => {
    svc = new RoomService();
    // make room IDs predictable
    vi
      .spyOn(RoomService.prototype, 'generateUniqueRoomId')
      .mockReturnValue(ROOM_ID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createRoom', () => {
    it('throws if no adminName', () => {
      expect(() => svc.createRoom('', ADMIN_IP)).toThrow(BadRequestError);
    });

    it('returns a 6-digit ID and stores the room', () => {
      const id = svc.createRoom(ADMIN_NAME, ADMIN_IP);
      expect(id).toBe(ROOM_ID);
      // now getRoom should succeed
      const room = svc.getRoom(ROOM_ID);
      expect(room.admin).toEqual({ name: ADMIN_NAME, ip: ADMIN_IP });
      expect(room.users).toEqual([]);
      expect(room.items).toEqual([]);
      expect(room.itemHistory).toEqual([]);
      expect(room.votes).toEqual({});
      expect(room.status).toBe(RoomStatus.SETUP);
      expect(room.bannedIps).toEqual([]);
    });
  });

  describe('deleteRoom', () => {
    it('throws if room does not exist', () => {
      expect(() => svc.deleteRoom(999)).toThrow(NotFoundError);
    });

    it('removes an existing room', () => {
      svc.createRoom(ADMIN_NAME, ADMIN_IP);
      svc.deleteRoom(ROOM_ID);
      expect(() => svc.getRoom(ROOM_ID)).toThrow(NotFoundError);
    });
  });

  describe('getRoom & isAdmin', () => {
    it('getRoom throws if not found', () => {
      expect(() => svc.getRoom(404)).toThrow(NotFoundError);
    });

    it('isAdmin returns false when room missing', () => {
      expect(svc.isAdmin(404, 'x')).toBe(false);
    });

    it('isAdmin identifies the admin by IP', () => {
      svc.createRoom(ADMIN_NAME, ADMIN_IP);
      expect(svc.isAdmin(ROOM_ID, ADMIN_IP)).toBe(true);
      expect(svc.isAdmin(ROOM_ID, '2.2.2.2')).toBe(false);
    });
  });

  describe('joinRoom', () => {
    beforeEach(() => {
      svc.createRoom(ADMIN_NAME, ADMIN_IP);
    });

    it('throws if missing userName or roomId', () => {
      expect(() => svc.joinRoom(0, 'bob', '2.2.2.2')).toThrow(BadRequestError);
      expect(() => svc.joinRoom(ROOM_ID, '', '2.2.2.2')).toThrow(BadRequestError);
    });

    it('throws if IP is banned', () => {
      // ban an IP in the room state
      const room = svc.getRoom(ROOM_ID);
      room.bannedIps.push('3.3.3.3');
      expect(() =>
        svc.joinRoom(ROOM_ID, 'bob', '3.3.3.3')
      ).toThrow(ForbiddenError);
    });

    it('lets admin rejoin', () => {
      const res = svc.joinRoom(ROOM_ID, ADMIN_NAME, ADMIN_IP);
      expect(res).toEqual({
        isAdmin: true,
        name: ADMIN_NAME,
        rejoin: true,
        roomState: { status: RoomStatus.SETUP, currentItem: null },
      });
    });

    it('lets a new user join', () => {
      const res = svc.joinRoom(ROOM_ID, 'bob', '2.2.2.2');
      expect(res.rejoin).toBe(false);
      expect(res.isAdmin).toBe(false);
      expect(res.name).toBe('bob');
      const room = svc.getRoom(ROOM_ID);
      expect(room.users).toEqual([{ name: 'bob', ip: '2.2.2.2' }]);
    });

    it('lets an existing user rejoin', () => {
      svc.joinRoom(ROOM_ID, 'bob', '2.2.2.2');
      const res = svc.joinRoom(ROOM_ID, 'bob', '2.2.2.2');
      expect(res.rejoin).toBe(true);
      expect(res.name).toBe('bob');
    });

    it('lets a user change their name on rejoin', () => {
      svc.joinRoom(ROOM_ID, 'bob', '2.2.2.2');
      const res = svc.joinRoom(ROOM_ID, 'bobby', '2.2.2.2');
      expect(res.rejoin).toBe(true);
      expect(res.name).toBe('bobby');
      // old name removed, new reflected
      const room = svc.getRoom(ROOM_ID);
      expect(room.users.map(u => u.name)).toEqual(['bobby']);
    });

    it('throws if duplicate username (admin or other user)', () => {
      // try to join with same name as admin
      expect(() =>
        svc.joinRoom(ROOM_ID, ADMIN_NAME, '9.9.9.9')
      ).toThrow(BadRequestError);

      // add bob, then another join with same name
      svc.joinRoom(ROOM_ID, 'bob', '2.2.2.2');
      expect(() =>
        svc.joinRoom(ROOM_ID, 'bob', '4.4.4.4')
      ).toThrow(BadRequestError);
    });
  });

  describe('getParticipants & validatePlayerInRoom', () => {
    beforeEach(() => {
      svc.createRoom(ADMIN_NAME, ADMIN_IP);
      svc.joinRoom(ROOM_ID, 'bob', '2.2.2.2');
    });

    it('returns admin + users', () => {
      expect(svc.getParticipants(ROOM_ID)).toEqual([
        { name: 'alice', isAdmin: true },
        { name: 'bob', isAdmin: false }
      ]);
    });

    it('validatePlayerInRoom throws for unknown', () => {
      const room = svc.getRoom(ROOM_ID);
      expect(() =>
        svc.validatePlayerInRoom(room, 'charlie')
      ).toThrow(ForbiddenError);
    });

    it('validatePlayerInRoom passes for known', () => {
      const room = svc.getRoom(ROOM_ID);
      expect(() =>
        svc.validatePlayerInRoom(room, 'bob')
      ).not.toThrow();
    });
  });

  describe('banUser', () => {
    beforeEach(() => {
      svc.createRoom(ADMIN_NAME, ADMIN_IP);
      svc.joinRoom(ROOM_ID, 'bob', '2.2.2.2');
    });

    it('throws if no userName', () => {
      expect(() => svc.banUser(ROOM_ID, '')).toThrow(BadRequestError);
    });

    it('throws if trying to ban admin', () => {
      expect(() =>
        svc.banUser(ROOM_ID, ADMIN_NAME)
      ).toThrow(BadRequestError);
    });

    it('throws if user not in room', () => {
      expect(() =>
        svc.banUser(ROOM_ID, 'charlie')
      ).toThrow(NotFoundError);
    });

    it('bans and removes a user', () => {
      // add bob again to ensure removal
      svc.joinRoom(ROOM_ID, 'bob', '2.2.2.2');
      const banned = svc.banUser(ROOM_ID, 'bob');
      expect(banned).toEqual({ name: 'bob', ip: '2.2.2.2' });
      const room = svc.getRoom(ROOM_ID);
      expect(room.bannedIps).toContain('2.2.2.2');
      expect(room.users.find(u => u.name === 'bob')).toBeUndefined();
    });
  });

  describe('setItems, getItems & getRoomStatus', () => {
    beforeEach(() => {
      svc.createRoom(ADMIN_NAME, ADMIN_IP);
    });

    it('setItems throws if not array', () => {
      // @ts-expect-error
      expect(() => svc.setItems(ROOM_ID, 'not-array')).toThrow(BadRequestError);
    });

    it('setItems sets items and status', () => {
      svc.setItems(ROOM_ID, ['A','B']);
      const room = svc.getRoom(ROOM_ID);
      expect(room.items).toEqual(['A','B']);
      expect(room.status).toBe(RoomStatus.ITEMS_SUBMITTED);
    });

    it('getItems returns items', () => {
      svc.setItems(ROOM_ID, ['X']);
      expect(svc.getItems(ROOM_ID)).toEqual(['X']);
    });

    it('getRoomStatus reflects the state', () => {
      svc.setItems(ROOM_ID, ['X','Y','Z']);
      // simulate one vote
      const room = svc.getRoom(ROOM_ID);
      room.votes!['alice'] = '5';
      room.itemHistory.push({ item: 'X', average: 5, votes: {}, summary: {} });
      const status = svc.getRoomStatus(ROOM_ID);
      expect(status).toEqual({
        status: RoomStatus.ITEMS_SUBMITTED,
        currentItem: 'X',
        itemsRemaining: 3,
        votesCount: 1,
        totalPlayers: 1,       // only admin so far
        completedItems: 1,
      });
    });
  });
});
