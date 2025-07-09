import { BadRequestError } from "../types/index.js";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const userRegex = require("../../assets/userRegEx.json") as { patterns: string[] };

export function validateRoomId(roomId: any): number {
  if (!roomId) {
    throw new BadRequestError("roomId is required");
  }
  
  const numericRoomId = Number(roomId);
  
  if (isNaN(numericRoomId) || numericRoomId <= 0) {
    throw new BadRequestError("roomId must be a valid positive number");
  }
  
  return numericRoomId;
}

export function validateUsername(userName: string): boolean {
  for (const pat of userRegex.patterns) {
    if (new RegExp(pat, ).test(userName)) {
      return false;
    }
  }
  return true;
}