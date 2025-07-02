import { Router, Request, Response } from "express";
import { gameService } from "../services/index.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { broadcast } from "../utils/ws.js";

const router = Router();

router.post(
  "/room/:roomId/vote",
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { vote, playerName }: { vote?: string; playerName?: string } = req.body;

    const { event } = gameService.vote(roomId, playerName!, vote!);

    if (gameService.isVoteComplete(roomId)) {
      console.log(`All players voted in ${roomId}, auto-revealing votes`);
      const gameEvent = gameService.revealVotes(roomId);
      broadcast(roomId, gameEvent);
      return res.json({ success: true, gameEvent });
    }

    broadcast(roomId, event);

    res.json({ success: true });
  })
);

router.get(
  "/room/:roomId/vote-status",
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const voteStatus = gameService.getVoteStatus(roomId);
    res.json(voteStatus);
  })
);

export default router;
