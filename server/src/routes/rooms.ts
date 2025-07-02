import { Router, Request, Response } from "express";
import { roomService } from "../services/index.js";
import { asyncHandler } from "../middleware/errorHandler.js";
import { broadcast } from "../utils/ws.js";

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
    const { name, roomId }: { name?: string; roomId?: string } = req.body;
    const ip = req.ip;

    const result = roomService.joinRoom(roomId!, name!, ip!);

    broadcast(roomId!, {
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
  const { roomId } = req.query;
  if (!roomId || typeof roomId !== "string") {
    return res.status(400).json({ error: "roomId is required" });
  }

  const isAdmin = roomService.isAdmin(roomId, req.ip!);
  console.log(`is-admin: ${req.ip} in ${roomId} = ${isAdmin}`);
  res.json({ isAdmin });
});

router.get(
  "/room/:roomId/items",
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const items = roomService.getItems(roomId);
    res.json({ items });
  })
);

router.get(
  "/room/:roomId/participants",
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const participants = roomService.getParticipants(roomId);
    res.json({ participants });
  })
);

router.get(
  "/room/:roomId/status",
  asyncHandler(async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const status = roomService.getRoomStatus(roomId);
    res.json(status);
  })
);

export default router;
