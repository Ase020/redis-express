import { availableParallelism } from "node:os";
import cluster from "node:cluster";
import app from "./server.js";

const PORT = process.env.PORT || 3000;

if (process.env.NODE_ENV === "production" && cluster.isPrimary) {
  const cpuCount = availableParallelism();
  console.log(`Primary ${process.pid} is running`);
  console.log(`Forking for ${cpuCount} CPU cores`);

  // Fork workers
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    if (code !== 0 && !worker.exitedAfterDisconnect) {
      console.log(`Worker ${worker.process.pid} died. Replacing...`);
      cluster.fork();
    }
  });
} else {
  // Workers share the TCP connection
  app
    .listen(PORT, () => {
      console.log(
        `Worker ${process.pid} started and listening on port ${PORT}`
      );
    })
    .on("error", (error: Error) => {
      console.error("Server error:", error);
      process.exit(1);
    });
}

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received");
  process.exit(0);
});
