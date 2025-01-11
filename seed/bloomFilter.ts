import { initializeRedisClient } from "../utils/client.js";
import { restaurantBloomKey } from "../utils/keys.js";

async function createBloomFilter() {
  const client = await initializeRedisClient();

  await Promise.all([
    client.del(restaurantBloomKey),
    client.bf.reserve(restaurantBloomKey, 0.0001, 1000000),
  ]);
}

await createBloomFilter();
process.exit();
