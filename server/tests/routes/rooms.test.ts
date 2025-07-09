// tests/publicRoutes.spec.ts
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

import { RoomStatus } from '../../src/types/index.js';
import type { GameEvent } from '../../src/types/index.js';
import { BadRequestError } from '../../src/types/index.js';

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
import { roomService, gameService } from '../../src/services/index.js';
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

  describe('POST /room/:roomId/vote', () => {
      const ROOM = 42;
      const PLAYER = 'alice';
      const VOTE = '5';
  
      it('broadcasts the event string and returns success when not complete', async () => {
        const voteEvent = {
          event: 'vote-status-update',
          voteCount: 1,
          totalPlayers: 3,
          votedPlayers: ['alice'],
          allPlayers: [
            { name: 'alice', isAdmin: true },
            { name: 'bob', isAdmin: false },
            { name: 'charlie', isAdmin: false }
          ]
        };
        vi.spyOn(gameService, 'vote').mockReturnValue(voteEvent as any);
        vi.spyOn(gameService, 'isVoteComplete').mockReturnValue(false);
        const bc = vi.spyOn(wsUtils, 'broadcast').mockImplementation(() => {});
  
        const res = await request(app)
          .post(`/room/${ROOM}/vote`)
          .send({ playerName: PLAYER, vote: VOTE })
          .expect(200);
  
        expect(res.body).toEqual({ success: true });
        expect(gameService.vote).toHaveBeenCalledWith(ROOM, PLAYER, VOTE);
        expect(bc).toHaveBeenCalledWith(ROOM, voteEvent);
        expect(gameService.isVoteComplete).toHaveBeenCalledWith(ROOM);
      });
  
      it('auto-reveals when complete: calls revealVotes, broadcasts and returns gameEvent', async () => {
        const revealEvent: GameEvent = {
          event: 'cards-revealed',
          results: { votes: {}, summary: {}, average: 0, totalVotes: 0, participants: [] },
          isLastItem: true,
        };
        vi.spyOn(gameService, 'vote').mockReturnValue({ event: 'vote-status-update' } as any);
        vi.spyOn(gameService, 'isVoteComplete').mockReturnValue(true);
        vi.spyOn(gameService, 'canRevealVotes').mockReturnValue(true);
        vi.spyOn(gameService, 'revealVotes').mockReturnValue(revealEvent);
        const bc = vi.spyOn(wsUtils, 'broadcast').mockImplementation(() => {});
  
        const res = await request(app)
          .post(`/room/${ROOM}/vote`)
          .send({ playerName: PLAYER, vote: VOTE })
          .expect(200);
  
        expect(res.body).toEqual({ success: true, gameEvent: revealEvent });
        expect(gameService.vote).toHaveBeenCalledWith(ROOM, PLAYER, VOTE);
        expect(gameService.isVoteComplete).toHaveBeenCalledWith(ROOM);
        expect(gameService.revealVotes).toHaveBeenCalledWith(ROOM);
        expect(bc).toHaveBeenCalledWith(ROOM, revealEvent);
      });
  
      it('returns 400 and JSON error+code when vote() throws BadRequestError', async () => {
        vi.spyOn(gameService, 'vote').mockImplementation(() => { throw new BadRequestError('oops'); });
        const res = await request(app)
          .post(`/room/${ROOM}/vote`)
          .send({ playerName: '', vote: '' })
          .expect(400);
  
        expect(res.body).toEqual({ error: 'oops', code: 'BAD_REQUEST' });
      });
    });
  
    describe('GET /room/:roomId/vote-status', () => {
      it('returns the status from getVoteStatus()', async () => {
        const fakeStatus = {
          voteCount: 1,
          totalPlayers: 2,
          votedPlayers: ['alice'],
          allPlayers: [
            { name: 'alice', isAdmin: true },
            { name: 'bob', isAdmin: false }
          ],
        };
        vi.spyOn(gameService, 'getVoteStatus').mockReturnValue(fakeStatus);
  
        const res = await request(app)
          .get(`/room/789/vote-status`)
          .expect(200);
  
        expect(res.body).toEqual(fakeStatus);
        expect(gameService.getVoteStatus).toHaveBeenCalledWith(789);
      });
    });
});
