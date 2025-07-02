import { Router, Request, Response } from "express";
import { roomService, gameService } from "../services/index.js";
import { asyncHandler, requireAdminAccess } from "../middleware/index.js";
import { broadcast, disconnectUser } from "../utils/ws.js";

const router = Router();

/**
 * Admin-only: set items for a room
 */
router.post(
  "/room/:roomId/items",
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { items }: { items?: string[] } = req.body;

    // Admin validation already done by middleware
    roomService.setItems(roomId, items!);
    res.json({ success: true });
  })
);

/**
 * Admin-only: start voting
 */
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

/**
 * Admin-only: reveal votes
 */
router.post(
  "/room/:roomId/reveal",
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const { results, isLastItem, event } = gameService.revealVotes(roomId);
    broadcast(roomId, event);

    res.json({ success: true, results, isLastItem });
  })
);

/**
 * Admin-only: repeat current voting
 */
router.post(
  "/room/:roomId/repeat",
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const event = gameService.repeatVoting(roomId);
    broadcast(roomId, event);

    res.json({ success: true, item: event.item });
  })
);

/**
 * Admin-only: next item
 */
router.post(
  "/room/:roomId/next",
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const event = gameService.nextItem(roomId);
    broadcast(roomId, event);

    res.json({ success: true, item: event.item });
  })
);

/**
 * Admin-only: show summary
 */
router.post(
  "/room/:roomId/summary",
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;

    const { summary, event } = gameService.showSummary(roomId);
    broadcast(roomId, event);

    res.json({ success: true, summary });
  })
);

/**
 * Admin-only: ban user
 */
router.post(
  "/room/:roomId/ban",
  requireAdminAccess,
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const { userName }: { userName?: string } = req.body;

    const user = roomService.banUser(roomId, userName!);

    // Disconnect the user's WebSocket
    disconnectUser(roomId, userName!);

    // Broadcast ban event
    broadcast(roomId, { event: "user-banned", user: userName });

    res.json({ success: true });
  })
);

export default router;
