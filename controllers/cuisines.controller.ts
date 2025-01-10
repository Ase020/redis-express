import type { NextFunction, Request, Response } from "express";
import { initializeRedisClient } from "../utils/client.js";
import { cuisineKey, cuisinesKey, restaurantKeyById } from "../utils/keys.js";
import { successResponse } from "../utils/responses.js";

export async function getCuisines(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const client = await initializeRedisClient();
    const cuisines = await client.sMembers(cuisinesKey);

    successResponse(res, cuisines);
  } catch (error) {
    console.error(error);
    next(error);
  }
}

export async function getCuisine(
  req: Request<{ cuisine: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { cuisine } = req.params;
  try {
    const client = await initializeRedisClient();
    const restaurantIds = await client.sMembers(cuisineKey(cuisine));
    const restaurants = await Promise.all(
      restaurantIds.map((id) => client.hGet(restaurantKeyById(id), "name"))
    );

    successResponse(res, restaurants);
  } catch (error) {
    console.error(error);
    next(error);
  }
}
