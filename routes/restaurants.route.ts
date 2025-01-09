import express from "express";
import { validate } from "../middlewares/validate.js";
import { RestaurantSchema } from "../schemas/restaurants.schema.js";
import {
  createRestaurant,
  getRestaurant,
} from "../controllers/restaurants.controller.js";
import { checkRestaurantExists } from "../middlewares/checkRestaurantId.js";

const router = express.Router();

router.get("/:restaurantId", checkRestaurantExists, getRestaurant);
router.post("/", validate(RestaurantSchema), createRestaurant);

export default router;
