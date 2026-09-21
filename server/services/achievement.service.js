const Achievement = require("../models/achievement.model");

/* add new achievement */
exports.addAchievement = async (req, res) => {
  try {
    const { body } = req;
    const achievement = new Achievement({
      status: body.status,
      game_id: body.game_id,
      achievement_group_id: body.achievement_group_id,
      platform_id: body.platform_id,
      external_id: body.external_id,
      name: body.name,
      description: body.description,
      achievement_type: body.achievement_type,
      points: body.points,
      hidden: body.hidden,
      icon_url: body.icon_url,
      rarity: body.rarity,
      is_dlc: body.is_dlc,
      dlc_game_id: body.dlc_game_id,
      creator: req.admin._id
    });

    await achievement.save();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "دستاورد با موفقیت ایجاد شد"
    });
  } catch (error) {
    console.error("Error in addAchievement:", error);
    res.status(500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: "خطا در ایجاد دستاورد",
      error: error.message
    });
  }
};

/* get all achievements */
exports.getAchievements = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 5;
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const achievements = await Achievement.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .populate({ path: "game_id", select: "title slug" })
      .populate({ path: "achievement_group_id", select: "name" })
      .populate({ path: "platform_id", select: "name code" })
      .populate({ path: "dlc_game_id", select: "title slug" })
      .populate({ path: "creator", select: "name avatar" });
    const total = await Achievement.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست دستاورد با موفقیت دریافت شد",
      data: achievements,
      total
    });
  } catch (error) {
    console.error("Error in getAchievements:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت دستاورد",
      description: error.message || error.toString()
    });
  }
};

/* get a achievement */
exports.getAchievement = async (req, res) => {
  const achievement = await Achievement.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "دستاورد با موفقیت دریافت شد",
    data: achievement
  });
};

/* update achievement */
exports.updateAchievement = async (req, res) => {
  const { body } = req;
  const updatedAchievement = {
    status: body.status,
    game_id: body.game_id,
    achievement_group_id: body.achievement_group_id,
    platform_id: body.platform_id,
    external_id: body.external_id,
    name: body.name,
    description: body.description,
    achievement_type: body.achievement_type,
    points: body.points,
    hidden: body.hidden,
    icon_url: body.icon_url,
    rarity: body.rarity,
    is_dlc: body.is_dlc,
    dlc_game_id: body.dlc_game_id
  };

  await Achievement.findByIdAndUpdate(req.params.id, updatedAchievement, { runValidators: true });

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "دستاورد با موفقیت ویرایش شد"
  });
};

/* delete achievement */
exports.deleteAchievement = async (req, res) => {
  const achievement = await Achievement.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!achievement) {
    return res.status(404).json({
      acknowledgement: false,
      message: "دستاورد پیدا نشد",
      description: "دستاورد که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "دستاورد با موفقیت حذف شد"
  });
};

exports.getAchievementOptions = async (req, res) => {
  const achievements = await Achievement.find().select("name");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست دستاورد با موفقیت دریافت شد",
    data: achievements
  });
};

exports.createAchievement = exports.addAchievement;
