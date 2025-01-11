import type { NextFunction, Request, Response } from "express";
import type {
  Restaurant,
  RestaurantDetails,
} from "../schemas/restaurants.schema.js";
import { initializeRedisClient } from "../utils/client.js";
import { nanoid } from "nanoid";
import {
  cuisineKey,
  cuisinesKey,
  restaurantBloomKey,
  restaurantCuisinesKeyById,
  restaurantDetailsKeysById,
  restaurantIndexKey,
  restaurantKeyById,
  restaurantsByRatingKey,
  reviewDetailsKeyById,
  reviewKeyById,
  weatherKeyById,
} from "../utils/keys.js";
import { errorResponse, successResponse } from "../utils/responses.js";
import type { Review } from "../schemas/reviews.schema.js";
import { getWeatherUrl } from "../utils/getWeatherUrl.js";

export async function getRestaurants(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { page = 1, limit = 10 } = req.query;
  const startIndex = (Number(page) - 1) * Number(limit);
  const endIndex = startIndex + Number(limit) - 1;

  try {
    const client = await initializeRedisClient();
    const restaurantIds = await client.zRange(
      restaurantsByRatingKey,
      startIndex,
      endIndex,
      { REV: true }
    );

    const restaurants = await Promise.all(
      restaurantIds.map((id) => client.hGetAll(restaurantKeyById(id)))
    );

    successResponse(res, restaurants);
  } catch (error) {
    console.error(error);
    next(error);
  }
}

export async function searchRestaurant(
  req: Request<{}, {}, {}, { q?: string | string[] }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  const searchQuery = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q;

  if (!searchQuery) {
    errorResponse(res, 400, "Search query is required");
    return;
  }

  try {
    const client = await initializeRedisClient();

    const escapedQuery = searchQuery.replace(
      /[<>{}[\]"':;!@#$%^&*()\-+=~]/g,
      "\\$&"
    );

    const searchResult = await client.ft.search(
      restaurantIndexKey,
      `@name:${escapedQuery}*`
    );

    successResponse(res, searchResult);
  } catch (error) {
    console.error(error);
    next(error);
  }
}

export async function createRestaurant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const data = req.body as Restaurant;

  try {
    const client = await initializeRedisClient();

    const id = nanoid();
    const bloomString = `${data.name}:${data.location}`;

    const seenBefore = await client.bf.exists(restaurantBloomKey, bloomString);
    if (!seenBefore) {
      errorResponse(res, 409, "Restaurant already exists");
      return;
    }

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
      client.zAdd(restaurantsByRatingKey, {
        score: 0,
        value: id,
      }),
      client.bf.add(restaurantBloomKey, bloomString),
    ]);

    successResponse(res, hashData, "New restaurant added.");
  } catch (error) {
    console.error(error);
    next(error);
  }
}

export async function getRestaurantWeather(
  req: Request<{ restaurantId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { restaurantId } = req.params;

  try {
    const client = await initializeRedisClient();
    const weatherKey = weatherKeyById(restaurantId);
    const cachedWeather = await client.get(weatherKey);
    if (cachedWeather) {
      console.log("Cache found");
      successResponse(res, JSON.parse(cachedWeather));
    }

    const restaurantKey = restaurantKeyById(restaurantId);

    const coords = await client.hGet(restaurantKey, "location");
    if (!coords) {
      errorResponse(res, 404, "Coordinates not found!");
      return;
    }

    const [lat, long] = coords?.split(",");

    if (!lat || !long) {
      errorResponse(res, 404, "Invalid coordinates format!");
      return;
    }
    const apiResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?units=imperial&lat=${Number(
        lat
      )}&lon=${Number(long)}&appid=${process.env.WEATHER_API_KEY}`
    );
    getWeatherUrl(Number(53.2734), Number(-7.77832031));
    // const apiResponse = await fetch(getWeatherUrl(Number(lat), Number(long)));
    // const apiResponse = await fetch(
    //   getWeatherUrl(Number(53.2734), Number(-7.77832031))
    // );

    if (apiResponse.status === 200) {
      const weatherData = await apiResponse.json();
      console.log("Data:", weatherData);
      await client.set(weatherKey, JSON.stringify(weatherData), {
        EX: 60 * 60,
      });
      successResponse(res, weatherData);
    }

    errorResponse(res, 500, "Couldn't fetch weather info!");
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
    const restaurantKey = restaurantKeyById(restaurantId);
    const reviewData = {
      id: reviewId,
      ...data,
      timeStamp: Date.now(),
      restaurantId,
    };

    const [reviewCount, setResult, totalStars] = await Promise.all([
      client.lPush(reviewKey, reviewId),
      client.hSet(reviewDetailsKey, reviewData),
      client.hIncrByFloat(restaurantKey, "totalStars", data.rating),
    ]);

    const averageRating = Number((totalStars / reviewCount).toFixed(1));

    await Promise.all([
      client.zAdd(restaurantsByRatingKey, {
        score: averageRating,
        value: restaurantId,
      }),
      client.hSet(restaurantKey, "avgStars", averageRating),
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

export async function createRestaurantDetails(
  req: Request<{ restaurantId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { restaurantId } = req.params;
  const data = req.body as RestaurantDetails;

  try {
    const client = await initializeRedisClient();
    const restaurantDetailsKey = restaurantDetailsKeysById(restaurantId);
    await client.json.set(restaurantDetailsKey, ".", data);

    successResponse(res, {}, "Restaurant details added successfully");
  } catch (error) {
    console.error(error);
    next(error);
  }
}

export async function getRestaurantDetails(
  req: Request<{ restaurantId: string }>,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { restaurantId } = req.params;

  try {
    const client = await initializeRedisClient();
    const restaurantDetailsKey = restaurantDetailsKeysById(restaurantId);
    const details = await client.json.get(restaurantDetailsKey);

    successResponse(res, details);
  } catch (error) {
    console.error(error);
    next(error);
  }
}
