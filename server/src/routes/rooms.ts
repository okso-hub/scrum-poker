import { Router, Request, Response } from "express";
import { roomService } from "../services/index.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { broadcast } from "../utils/ws.js";
import { gameService } from "../services/index.js";
import { validateRoomId } from "../utils/validation.js";

const router = Router();

router.post(
  "/create",
  asyncHandler(async (req: Request, res: Response) => {
    const { name }: { name?: string } = req.body;
    const ip = req.ip;

    const roomId = roomService.createRoom(name!, ip!);
    res.json({ roomId });
  })
);

router.post(
  "/join",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, roomId }: { name?: string; roomId?: number } = req.body;
    const ip = req.ip;

    const validatedRoomId = validateRoomId(roomId);
    const result = roomService.joinRoom(validatedRoomId, name!, ip!);

    broadcast(validatedRoomId, {
      event: "user-joined",
      rejoin: result.rejoin,
      user: name,
    });

    res.json({
      success: true,
      isAdmin: result.isAdmin,
      name: result.name,
      roomState: result.roomState,
    });
  })
);

router.get("/is-admin", (req: Request, res: Response) => {
  const roomId = validateRoomId(req.query.roomId);

  const isAdmin = roomService.isAdmin(roomId, req.ip!);
  console.log(`is-admin: ${req.ip} in ${roomId} = ${isAdmin}`);
  res.json({ isAdmin });
});

router.get(
  "/room/:roomId/items",
  asyncHandler(async (req: Request, res: Response) => {
    const roomId = validateRoomId(req.params.roomId);
    const items = roomService.getItems(roomId);
    res.json({ items });
  })
);

router.get(
  "/room/:roomId/participants",
  asyncHandler(async (req: Request, res: Response) => {
    const roomId = validateRoomId(req.params.roomId);
    const participants = roomService.getParticipants(roomId);
    res.json({ participants });
  })
);

router.get(
  "/room/:roomId/status",
  asyncHandler(async (req: Request, res: Response) => {
    const roomId = validateRoomId(req.params.roomId);
    const status = roomService.getRoomStatus(roomId);
    res.json(status);
  })
);

router.post(
  "/room/:roomId/vote",
  asyncHandler(async (req: Request, res: Response) => {
    const roomId = validateRoomId(req.params.roomId);
    const { vote, playerName }: { vote?: string; playerName?: string } = req.body;

    const gameEvent = gameService.vote(roomId, playerName!, vote!);

    if (gameService.isVoteComplete(roomId) && gameService.canRevealVotes(roomId)) {
      console.log(`All players voted in ${roomId}, auto-revealing votes`);

      const revealEvent = gameService.revealVotes(roomId);
      broadcast(roomId, revealEvent);
      return res.json({ success: true, gameEvent: revealEvent });
    }

    broadcast(roomId, gameEvent);

    res.json({ success: true });
  })
);

router.get(
  "/room/:roomId/vote-status",
  asyncHandler(async (req: Request, res: Response) => {
    const roomId = validateRoomId(req.params.roomId);
    const voteStatus = gameService.getVoteStatus(roomId);
    res.json(voteStatus);
  })
);

export default router;
