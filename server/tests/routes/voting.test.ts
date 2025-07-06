// tests/routes/voting.test.ts
import { describe, it, beforeEach, expect, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

// 1) Mock only asyncHandler, keep the real errorHandler
vi.mock('../../src/middleware/errorHandler.js', async () => {
  const mod = await vi.importActual<any>('../../src/middleware/errorHandler.js');
  return {
    ...mod,
    asyncHandler: (fn: any) => fn,
  };
});

import { BadRequestError } from '../../src/types/index.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import router from '../../src/routes/index.js';
import { gameService } from '../../src/services/index.js';
import * as wsUtils from '../../src/utils/ws.js';
import type { GameEvent } from '../../src/types/index.js';

describe('Vote Routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(router);
    // mount the real error handler
    app.use(errorHandler);
    vi.clearAllMocks();
  });

  describe('POST /room/:roomId/vote', () => {
    const ROOM = 'room42';
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
        .get(`/room/xyz/vote-status`)
        .expect(200);

      expect(res.body).toEqual(fakeStatus);
      expect(gameService.getVoteStatus).toHaveBeenCalledWith('xyz');
    });
  });
});
