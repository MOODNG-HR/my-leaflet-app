import { Router, type IRouter } from "express";
import healthRouter from "./health";
import adminRouter from "./admin";
import leaveRouter from "./leave";

const router: IRouter = Router();

router.use(healthRouter);
router.use(adminRouter);
router.use(leaveRouter);

export default router;
