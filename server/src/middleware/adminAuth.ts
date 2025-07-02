import { Request, Response, NextFunction } from "express";
import { roomService } from "../services/index.js";
import { ForbiddenError, BadRequestError } from "../types/index.js";

/**
 * Middleware to verify admin access to a room
 * Expects roomId to be in req.params.roomId
 */
export function requireAdminAccess(req: Request, res: Response, next: NextFunction): void {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      throw new BadRequestError("roomId is required");
    }

    const ip = req.ip || "unknown";

    // Check if the requesting IP is the admin of this room
    if (!roomService.isAdmin(roomId, ip)) {
      throw new ForbiddenError("Admin access required for this operation");
    }

    // // Store room validation result for later use in the route handler
    // req.adminValidated = {
    //   roomId,
    //   adminIp: ip,
    // };

    next();
  } catch (error) {
    next(error);
  }
}

// // Extend Express Request interface to include our custom property
// declare global {
//   namespace Express {
//     interface Request {
//       adminValidated?: {
//         roomId: string;
//         adminIp: string;
//       };
//     }
//   }
// }
