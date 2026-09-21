const Game = require("../models/game.model");

/* add new game */
exports.addGame = async (req, res) => {
  try {
    const { body } = req;
    const game = new Game({
      status: body.status,
      title: body.title,
      slug: body.slug,
      sort_title: body.sort_title,
      content_type: body.content_type,
      parent_game_id: body.parent_game_id,
      short_description: body.short_description,
      description: body.description,
      release_date: body.release_date,
      official_website: body.official_website,
      developer_id: body.developer_id,
      publisher_id: body.publisher_id,
      cover_media_id: body.cover_media_id,
      genre_ids: typeof body.genre_ids === "string" ? JSON.parse(body.genre_ids || "[]") : body.genre_ids,
      creator: req.admin._id
    });

    await game.save();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "بازی با موفقیت ایجاد شد"
    });
  } catch (error) {
    console.error("Error in addGame:", error);
    res.status(500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: "خطا در ایجاد بازی",
      error: error.message
    });
  }
};

/* get all games */
exports.getGames = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 5;
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const games = await Game.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .populate({ path: "parent_game_id", select: "title slug" })
      .populate({ path: "developer_id", select: "name slug" })
      .populate({ path: "publisher_id", select: "name slug" })
      .populate({ path: "cover_media_id", select: "url" })
      .populate({ path: "genre_ids", select: "name slug" })
      .populate({ path: "creator", select: "name avatar" });
    const total = await Game.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست بازی با موفقیت دریافت شد",
      data: games,
      total
    });
  } catch (error) {
    console.error("Error in getGames:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت بازی",
      description: error.message || error.toString()
    });
  }
};

/* get a game */
exports.getGame = async (req, res) => {
  const game = await Game.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "بازی با موفقیت دریافت شد",
    data: game
  });
};

/* update game */
exports.updateGame = async (req, res) => {
  const { body } = req;
  const updatedGame = {
    status: body.status,
    title: body.title,
    slug: body.slug,
    sort_title: body.sort_title,
    content_type: body.content_type,
    parent_game_id: body.parent_game_id,
    short_description: body.short_description,
    description: body.description,
    release_date: body.release_date,
    official_website: body.official_website,
    developer_id: body.developer_id,
    publisher_id: body.publisher_id,
    cover_media_id: body.cover_media_id,
    genre_ids: typeof body.genre_ids === "string" ? JSON.parse(body.genre_ids || "[]") : body.genre_ids
  };

  await Game.findByIdAndUpdate(req.params.id, updatedGame, { runValidators: true });

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "بازی با موفقیت ویرایش شد"
  });
};

/* delete game */
exports.deleteGame = async (req, res) => {
  const game = await Game.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!game) {
    return res.status(404).json({
      acknowledgement: false,
      message: "بازی پیدا نشد",
      description: "بازی که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "بازی با موفقیت حذف شد"
  });
};

exports.getGameOptions = async (req, res) => {
  const games = await Game.find().select("title slug");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست بازی با موفقیت دریافت شد",
    data: games
  });
};

exports.createGame = exports.addGame;
