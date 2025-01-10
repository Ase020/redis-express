import type { NextFunction, Request, Response } from "express";
import type { Restaurant } from "../schemas/restaurants.schema.js";
import { initializeRedisClient } from "../utils/client.js";
import { nanoid } from "nanoid";
import {
  cuisineKey,
  cuisinesKey,
  restaurantCuisinesKeyById,
  restaurantKeyById,
  reviewDetailsKeyById,
  reviewKeyById,
} from "../utils/keys.js";
import { errorResponse, successResponse } from "../utils/responses.js";
import type { Review } from "../schemas/reviews.schema.js";

export async function createRestaurant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const data = req.body as Restaurant;

  try {
    const client = await initializeRedisClient();

    const id = nanoid();
    const restaurantKey = restaurantKeyById(id);
    const hashData = { id, name: data.name, location: data.location };

    await Promise.all([
      ...data.cuisines.map((cuisine) =>
        Promise.all([
          client.sAdd(cuisinesKey, cuisine),
          client.sAdd(cuisineKey(cuisine), id),
          client.sAdd(restaurantCuisinesKeyById(id), cuisine),
        ])
      ),
      client.hSet(restaurantKey, hashData),
    ]);

    successResponse(res, hashData, "New restaurant added.");
  } catch (error) {
    console.error(error);
    next(error);
  }
}

export async function createRestaurantReview(
  req: Request<{ restaurantId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { restaurantId } = req.params;
  const data = req.body as Review;

  try {
    const client = await initializeRedisClient();
    const reviewId = nanoid();
    const reviewKey = reviewKeyById(restaurantId);
    const reviewDetailsKey = reviewDetailsKeyById(reviewId);
    const reviewData = {
      id: reviewId,
      ...data,
      timeStamp: Date.now(),
      restaurantId,
    };

    await Promise.all([
      client.lPush(reviewKey, reviewId),
      client.hSet(reviewDetailsKey, reviewData),
    ]);
    successResponse(res, reviewData, "Review added successfully.");
  } catch (error) {
    console.error(error);
    next(error);
  }
}

export async function getRestaurantReviews(
  req: Request<{ restaurantId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { restaurantId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const startIndex = (Number(page) - 1) * Number(limit);
  const endIndex = startIndex * Number(limit) - 1;

  try {
    const client = await initializeRedisClient();
    const reviewKey = reviewKeyById(restaurantId);
    const reviewIds = await client.lRange(reviewKey, startIndex, endIndex);
    const reviews = await Promise.all(
      reviewIds.map((id) => client.hGetAll(reviewDetailsKeyById(id)))
    );

    successResponse(res, reviews);
  } catch (error) {
    console.error(error);
    next(error);
  }
}

export async function deleteRestaurantReview(
  req: Request<{ restaurantId: string; reviewId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { restaurantId, reviewId } = req.params;

  try {
    const client = await initializeRedisClient();
    const reviewKey = reviewKeyById(restaurantId);
    const reviewDetailsKey = reviewDetailsKeyById(reviewId);
    const [removeResult, deleteResult] = await Promise.all([
      client.lRem(reviewKey, 0, reviewId),
      client.del(reviewDetailsKey),
    ]);

    if (removeResult === 0 && deleteResult === 0) {
      errorResponse(res, 404, "Review not found");
    }

    successResponse(res, reviewId, "Review deleted successfully");
  } catch (error) {
    console.error(error);
    next(error);
  }
}

export async function getRestaurant(
  req: Request<{ restaurantId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { restaurantId } = req.params;

  try {
    const client = await initializeRedisClient();
    const restaurantKey = restaurantKeyById(restaurantId);
    const [viewCount, restaurant, cuisines] = await Promise.all([
      client.hIncrBy(restaurantKey, "viewCount", 1),
      client.hGetAll(restaurantKey),
      client.sMembers(restaurantCuisinesKeyById(restaurantId)),
    ]);

    // Redis returns an empty object if the key doesn't exist
    // if (Object.keys(restaurant).length === 0) {
    //   res.status(404).json({
    //     success: false,
    //     message: `Restaurant with id ${restaurantId} not found`,
    //   });
    //   return;
    // }

    successResponse(res, { ...restaurant, cuisines });
  } catch (error) {
    console.error(error);
    next(error);
  }
}
