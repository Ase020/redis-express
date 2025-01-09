import express from "express";
import { validate } from "../middlewares/validate.js";
import { RestaurantSchema } from "../schemas/restaurants.schema.js";
import { createRestaurant } from "../controllers/restaurants.controller.js";

const router = express.Router();

router.post("/", validate(RestaurantSchema), createRestaurant);

export default router;
