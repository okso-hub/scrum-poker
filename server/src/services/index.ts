import { RoomService } from "./RoomService.js";
import { GameService } from "./GameService.js";

// Create service instances
export const roomService = new RoomService();
export const gameService = new GameService(roomService);

// Export service classes for testing
export { RoomService, GameService };
