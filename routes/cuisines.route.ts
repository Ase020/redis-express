import express, { Router } from "express";
import { getCuisine, getCuisines } from "../controllers/cuisines.controller.js";

const router: Router = express.Router();

router.get("/", getCuisines);
router.get("/:cuisine", getCuisine);

export default router;
