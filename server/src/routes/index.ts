import { Router } from "express";
import roomsRouter from "./rooms.js";
import votingRouter from "./voting.js";
import adminRouter from "./admin.js";

const router = Router();

// Mount route modules
router.use(roomsRouter);
router.use(votingRouter);
router.use(adminRouter);

export default router;
