import { BadRequestError } from "../types/index.js";

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