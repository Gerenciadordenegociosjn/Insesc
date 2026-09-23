import { Router, type IRouter } from "express";
import healthRouter from "./health";
import donationsRouter from "./donations";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(donationsRouter);
router.use(authRouter);

export default router;
