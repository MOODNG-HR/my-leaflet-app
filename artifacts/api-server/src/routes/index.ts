import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leaveRouter from "./leave";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leaveRouter);

export default router;
