import express from "express";

const router = express.Router();

router.get("/", async (req, res) => {
  res.send("Cuisines path hello");
});

export default router;
