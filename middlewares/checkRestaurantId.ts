import type { Response, Request, NextFunction } from "express";
import { errorResponse } from "../utils/responses.js";
import { initializeRedisClient } from "../utils/client.js";
import { restaurantKeyById } from "../utils/keys.js";

export async function checkRestaurantExists(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { restaurantId } = req.params;
  if (!restaurantId) {
    errorResponse(res, 404, `Restaurant with id ${restaurantId} not found`);
    return;
  }

  try {
    const client = await initializeRedisClient();
    const restaurantKey = restaurantKeyById(restaurantId);
    const exists = await client.exists(restaurantKey);

    if (!exists) {
      errorResponse(res, 404, "Restaurant not found");
      return;
    }

    next();
  } catch (error) {
    console.log(error);
    next(error);
  }
}
