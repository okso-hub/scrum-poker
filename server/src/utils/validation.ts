export function validateRoomId(roomId: any): number {
  if (!roomId) {
    throw new Error("roomId is required");
  }
  
  const numericRoomId = Number(roomId);
  
  if (isNaN(numericRoomId) || numericRoomId <= 0) {
    throw new Error("roomId must be a valid positive number");
  }
  
  return numericRoomId;
}