require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const logger = require("./logger");

/************************************************************
 * Database Connection
 ************************************************************/
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/codeview")
.then(() => logger.log("✅ MongoDB connected successfully"))
.catch((err) => {
  logger.error("❌ MongoDB connection error:", err.message);
  logger.log("⚠️  Server will continue running, but database features may not work.");
  logger.log("💡 Please check your MongoDB connection string or ensure your MongoDB cluster is running.");
});

/************************************************************
 * Server & Socket.IO Setup
 ************************************************************/
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/************************************************************
 * Middleware
 ************************************************************/
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

/************************************************************
 * Health Check
 ************************************************************/
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

/************************************************************
 * Routes
 ************************************************************/
const roomRoutes = require("./routes/roomRoutes");
const fileRoutes = require("./routes/fileRoutes");
const { router: annotationRoutes } = require("./routes/annotationRoutes");
const aiRoutes = require("./routes/aiRoutes");
const novaAiRoutes = require("./routes/novaAiRoutes");
const executeRoutes = require("./routes/executeRoutes");

app.use("/api/rooms", roomRoutes);
app.use("/api/rooms", fileRoutes);
app.use("/api/rooms", annotationRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/nova-ai", novaAiRoutes);
app.use("/api", executeRoutes);

/************************************************************
 * Socket.IO Handlers
 ************************************************************/
const initSocketHandlers = require("./socket/socketHandler");
initSocketHandlers(io);

/************************************************************
 * Start Server
 ************************************************************/
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => logger.log(`Server is running on port ${PORT}`));
