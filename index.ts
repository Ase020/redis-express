import express from "express";

import cuisinesRouter from "./routes/cuisines.route.js";
import restaurantsRouter from "./routes/restaurants.route.js";
import { errorHandler } from "./middlewares/errorHandlers.js";

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use("/api/v1/cuisines", cuisinesRouter);
app.use("/api/v1/restaurants", restaurantsRouter);

app.use(errorHandler);
app
  .listen(PORT, () => console.log(`Application running on port: ${PORT}`))
  .on("error", (error) => {
    throw new Error(error.message);
  });
