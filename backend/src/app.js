const express = require("express");
const cors = require("cors");
require("dotenv").config();

const apiRoutes = require("./routes");
const {
  notFoundMiddleware,
  errorMiddleware,
} = require("./middlewares/errorMiddleware");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

module.exports = app;
