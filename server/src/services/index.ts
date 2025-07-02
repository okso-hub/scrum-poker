import { RoomService } from "./RoomService.js";
import { GameService } from "./GameService.js";

export const roomService = new RoomService();
export const gameService = new GameService(roomService);

export { RoomService, GameService };
