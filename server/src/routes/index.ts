import { Router } from "express";
import roomsRouter from "./rooms.js";
import adminRouter from "./admin.js";

const router = Router();

router.use(roomsRouter);
router.use(adminRouter);

export default router;
