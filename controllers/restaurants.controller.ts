import type { Request, Response } from "express";
import type { Restaurant } from "../schemas/restaurants.schema.js";
import { initializeRedisClient } from "../utils/client.js";

export async function createRestaurant(req: Request, res: Response) {
  const data = req.body as Restaurant;

  const client = await initializeRedisClient();

  res.send("Hello from the restaurant");
}
