import { Request, Response, NextFunction } from "express";
import { roomService } from "../services/index.js";
import { ForbiddenError, BadRequestError } from "../types/index.js";
import { validateRoomId } from "../utils/validation.js";

export function requireAdminAccess(req: Request, res: Response, next: NextFunction): void {
  try {
    const roomId = validateRoomId(req.params.roomId);

    if (!roomId) {
      throw new BadRequestError("roomId is required");
    }

    const ip = req.ip || "unknown";

    if (!roomService.isAdmin(roomId, ip)) {
      throw new ForbiddenError("Admin access required for this operation");
    }

    next();
  } catch (error) {
    next(error);
  }
}
