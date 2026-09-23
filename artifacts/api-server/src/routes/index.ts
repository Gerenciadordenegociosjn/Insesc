import { Router, type IRouter } from "express";
import healthRouter from "./health";
import donationsRouter from "./donations";
import authRouter from "./auth";
import portalRouter from "./portal";

const router: IRouter = Router();

router.use(healthRouter);
router.use(donationsRouter);
router.use(authRouter);
router.use(portalRouter);

export default router;
