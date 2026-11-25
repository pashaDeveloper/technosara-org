const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env"), override: true });
const session = require("express-session");
const cookieParser = require("cookie-parser");
const error = require("./middleware/error.middleware");
const notFound = require("./middleware/notFound.middleware");

const app = express();
app.set("trust proxy", true);

/* allowed origins */
const allowedOrigins = [
  process.env.NEXT_PUBLIC_CLIENT_URL,
  process.env.NEXT_PUBLIC_DASHBOARD_URL
];

const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "x-lang", "Cache-Control", "Pragma", "Expires"],
  credentials: true
};

app.use(cors(corsOptions));

app.use(['/api/stores', '/api/game-tags', '/api/game-modes', '/api/game-series', '/api/collections', '/api/genres', '/api/platforms', '/api/companies', '/api/people', '/api/brands'], express.json({ limit: '8mb' }));
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-session-secret-change-me",
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: false,
      sameSite: "lax"
    }
  })
);

app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.set("Surrogate-Control", "no-store");
  next();
});

app.use("/api/bot", require("./routes/bot.route"));
app.use("/api/gamebrain", require("./routes/gamebrain.route"));
app.use('/api', require('./routes/canonicalCatalog.route'));
app.use(["/api/translations", "/api/translate"], require("./routes/translation.route"));
app.use("/api/catalog", require("./routes/catalog.route"));
app.use("/api/editions", require("./routes/catalogResource.route")("editions"));
app.use("/api/games", require("./routes/game.route"));
app.use('/api/upload-settings', require('./routes/uploadSettings.route'));
app.use('/api/upload', require('./routes/upload.route'));
app.use("/api/game-platforms", require("./routes/catalogResource.route")("game-platforms"));
app.use("/api/store-products", require("./routes/catalogResource.route")("store-products"));
app.use("/api/products", require("./routes/retailProduct.route"));
app.use("/api/game-contents", require("./routes/catalogResource.route")("game-contents"));
app.use("/api/age-ratings", require("./routes/ageRating.route"));
app.use("/api/media", require("./routes/media.route"));
app.use("/api/stores", require("./routes/store.route"));
app.use("/api/achievement-groups", require("./routes/achievementGroup.route"));
app.use("/api/achievements", require("./routes/achievement.route"));
app.use("/api/users", require("./routes/user.route"));
app.use("/api/user", require("./routes/accountProfile.route"));
app.use("/api/addresses", require("./routes/address.route"));
app.use("/api/examples", require("./routes/example.route"));
app.use("/api/platforms", require("./routes/platform.route"));
app.use("/api/brands", require("./routes/brand.route"));
app.use("/api/game-tags", require("./routes/gameTag.route"));
app.use("/api/collections", require("./routes/collection.route"));
app.use("/api/game-modes", require("./routes/gameMode.route"));
app.use("/api/game-series", require("./routes/gameSeries.route"));
app.use("/api/genres", require("./routes/genre.route"));
app.use("/api/companies", require("./routes/company.route"));
app.use("/api/people", require("./routes/person.route"));
app.use("/api/admin", require("./routes/admin.route"));


app.use(notFound);
app.use(error);

module.exports = app;
