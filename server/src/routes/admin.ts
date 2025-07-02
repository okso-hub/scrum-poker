import { Router, Request, Response } from "express";
import { roomService, gameService } from "../services/index.js";
import { asyncHandler, requireAdminAccess } from "../middleware/index.js";
import { broadcast, disconnectUser } from "../utils/ws.js";

const router = Router();

router.post(
  "/room/:roomId/items",
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { items }: { items?: string[] } = req.body;

    roomService.setItems(roomId, items!);
    res.json({ success: true });
  })
);

router.post(
  "/room/:roomId/start",
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const event = gameService.startVoting(roomId);
    broadcast(roomId, event);

    res.json({ success: true });
  })
);

router.post(
  "/room/:roomId/reveal",
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const gameEvent = gameService.revealVotes(roomId);
    broadcast(roomId, gameEvent);

    res.json({ success: true, gameEvent });
  })
);

router.post(
  "/room/:roomId/repeat",
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const gameEvent = gameService.repeatVoting(roomId);
    broadcast(roomId, gameEvent);

    res.json({ success: true, item: gameEvent.item });
  })
);

router.post(
  "/room/:roomId/next",
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const gameEvent = gameService.nextItem(roomId);
    broadcast(roomId, gameEvent);

    res.json({ success: true, item: gameEvent.item });
  })
);

router.post(
  "/room/:roomId/summary",
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const gameEvent = gameService.showSummary(roomId);
    broadcast(roomId, gameEvent);

    res.json({ success: true, gameEvent });
  })
);

router.post(
  "/room/:roomId/ban",
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { name }: { name?: string } = req.body;

    const user = roomService.banUser(roomId, name!);

    disconnectUser(roomId, name!);

    broadcast(roomId, { event: "user-banned", user: name });

    res.json({ success: true });
  })
);

export default router;
