import { Router, Request, Response } from "express";
import { gameService } from "../services/index.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { broadcast } from "../utils/ws.js";

const router = Router();

/**
 * POST /room/:roomId/vote - Player votes on current item
 */
router.post(
  "/room/:roomId/vote",
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { vote, playerName }: { vote?: string; playerName?: string } = req.body;

    const { event } = gameService.vote(roomId, playerName!, vote!);
    broadcast(roomId, event);

    res.json({ success: true });
  })
);

/**
 * GET /room/:roomId/vote-status - Get current vote status
 */
router.get(
  "/room/:roomId/vote-status",
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const voteStatus = gameService.getVoteStatus(roomId);
    res.json(voteStatus);
  })
);

export default router;
