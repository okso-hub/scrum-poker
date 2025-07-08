// tests/publicRoutes.spec.ts
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

import { RoomStatus } from '../../src/types/index.js';

// 1) Mock asyncHandler so routes run raw
vi.mock('../src/middleware/errorHandler.js', () => ({
  asyncHandler: (fn: any) => fn,
  errorHandler: (error: any, req: any, res: any, next: any) => {
    if (error.statusCode) {
      res.status(error.statusCode).json({ error: error.message, code: error.code });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}));

// 2) Now import the router under test
import router from '../../src/routes/index.js';

// 3) Stub roomService and wsUtils
import { roomService } from '../../src/services/index.js';
import * as wsUtils from '../../src/utils/ws.js';

describe('Public Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(router);
    // Add error handler
    app.use((error: any, req: any, res: any, next: any) => {
      if (error.statusCode) {
        res.status(error.statusCode).json({ error: error.message, code: error.code });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    });
    vi.clearAllMocks();
  });

  describe('POST /create', () => {
    it('returns generated roomId', async () => {
      vi.spyOn(roomService, 'createRoom').mockReturnValue(42);
      const res = await request(app)
        .post('/create')
        .send({ name: 'alice' })
        .expect(200);
      expect(res.body).toEqual({ roomId: 42 });
      expect(roomService.createRoom).toHaveBeenCalledWith('alice', expect.any(String));
    });
  });

  describe('POST /join', () => {
    it('joins and broadcasts user-joined, returns join info', async () => {
      const fakeResult = {
        isAdmin: false,
        name: 'bob',
        rejoin: true,
        roomState: { status: RoomStatus.VOTING, currentItem: 'item1' },
      };
      vi.spyOn(roomService, 'joinRoom').mockReturnValue(fakeResult);
      const bc = vi.spyOn(wsUtils, 'broadcast').mockImplementation(() => {});

      const res = await request(app)
        .post('/join')
        .send({ name: 'bob', roomId: 1 })
        .expect(200);

      expect(res.body).toEqual({
        success: true,
        isAdmin: false,
        name: 'bob',
        roomState: fakeResult.roomState,
      });
      expect(roomService.joinRoom).toHaveBeenCalledWith(1, 'bob', expect.any(String));
      expect(bc).toHaveBeenCalledWith(1, {
        event: 'user-joined',
        rejoin: true,
        user: 'bob',
      });
    });
  });

  describe('GET /is-admin', () => {
    it('returns 400 if roomId missing', async () => {
      await request(app)
        .get('/is-admin')
        .expect(400, { error: 'roomId is required', code: 'BAD_REQUEST' });
    });

    it('returns isAdmin flag', async () => {
      vi.spyOn(roomService, 'isAdmin').mockReturnValue(true);
      const res = await request(app)
        .get('/is-admin')
        .query({ roomId: 1 })
        .expect(200);
      expect(res.body).toEqual({ isAdmin: true });
      expect(roomService.isAdmin).toHaveBeenCalledWith(1, expect.any(String));
    });
  });

  describe('GET /room/:roomId/items', () => {
    it('returns items array', async () => {
      vi.spyOn(roomService, 'getItems').mockReturnValue(['a', 'b']);
      const res = await request(app)
        .get('/room/2/items')
        .expect(200);
      expect(res.body).toEqual({ items: ['a', 'b'] });
      expect(roomService.getItems).toHaveBeenCalledWith(2);
    });
  });

  describe('GET /room/:roomId/participants', () => {
    it('returns participants array', async () => {
      vi.spyOn(roomService, 'getParticipants').mockReturnValue([
        { name: 'alice', isAdmin: true },
        { name: 'bob', isAdmin: false }
      ]);
      const res = await request(app)
        .get('/room/3/participants')
        .expect(200);
      expect(res.body).toEqual({ participants: [
        { name: 'alice', isAdmin: true },
        { name: 'bob', isAdmin: false }
      ] });
      expect(roomService.getParticipants).toHaveBeenCalledWith(3);
    });
  });

  describe('GET /room/:roomId/status', () => {
    it('returns status blob', async () => {
      const fakeStatus = {
        status: RoomStatus.SETUP,
        currentItem: null,
        itemsRemaining: 2,
        votesCount: 0,
        totalPlayers: 1,
        completedItems: 0,
      };
      vi.spyOn(roomService, 'getRoomStatus').mockReturnValue(fakeStatus);
      const res = await request(app)
        .get('/room/4/status')
        .expect(200);
      expect(res.body).toEqual(fakeStatus);
      expect(roomService.getRoomStatus).toHaveBeenCalledWith(4);
    });
  });
});
