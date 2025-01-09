import type { NextFunction, Request, Response } from "express";
import type { Restaurant } from "../schemas/restaurants.schema.js";
import { initializeRedisClient } from "../utils/client.js";
import { nanoid } from "nanoid";
import { restaurantKeyById } from "../utils/keys.js";
import { successResponse } from "../utils/responses.js";
import type { ZodVoid } from "zod";

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

    const addResult = await client.hSet(restaurantKey, hashData);
    console.log(`Added ${addResult} fields`);

    successResponse(res, hashData, "New restaurant added.");
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
    const [viewCount, restaurant] = await Promise.all([
      client.hIncrBy(restaurantKey, "viewCount", 1),
      client.hGetAll(restaurantKey),
    ]);

    // Redis returns an empty object if the key doesn't exist
    // if (Object.keys(restaurant).length === 0) {
    //   res.status(404).json({
    //     success: false,
    //     message: `Restaurant with id ${restaurantId} not found`,
    //   });
    //   return;
    // }

    successResponse(res, restaurant);
  } catch (error) {
    console.error(error);
    next(error);
  }
}
