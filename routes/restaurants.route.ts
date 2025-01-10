import express, { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { RestaurantSchema } from "../schemas/restaurants.schema.js";
import {
  createRestaurant,
  createRestaurantReview,
  deleteRestaurantReview,
  getRestaurant,
  getRestaurantReviews,
  getRestaurants,
  getRestaurantWeather,
} from "../controllers/restaurants.controller.js";
import { checkRestaurantExists } from "../middlewares/checkRestaurantId.js";
import { ReviewSchema } from "../schemas/reviews.schema.js";

const router: Router = express.Router();
router.get("/", getRestaurants);
router.post("/", validate(RestaurantSchema), createRestaurant);
router.get(
  "/:restaurantId/weather",
  checkRestaurantExists,
  getRestaurantWeather
);
router.post(
  "/:restaurantId/reviews",
  checkRestaurantExists,
  validate(ReviewSchema),
  createRestaurantReview
);
router.get(
  "/:restaurantId/reviews",
  checkRestaurantExists,
  getRestaurantReviews
);
router.delete(
  "/:restaurantId/reviews/:reviewId",
  checkRestaurantExists,
  deleteRestaurantReview
);
router.get("/:restaurantId", checkRestaurantExists, getRestaurant);

export default router;
