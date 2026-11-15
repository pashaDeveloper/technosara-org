const AchievementGroup = require("../models/achievementGroup.model");

/* add new achievementGroup */
exports.addAchievementGroup = async (req, res) => {
  try {
    const { body } = req;
    const achievementGroup = new AchievementGroup({
      status: body.status,
      game_id: body.game_id,
      platform_id: body.platform_id,
    provider: body.provider,
    external_set_id: body.external_set_id,
      external_group_id: body.external_group_id,
      name: body.name,
      group_type: body.group_type,
      dlc_id: body.dlc_id,
      total_achievements: body.total_achievements,
      total_points: body.total_points,
      icon_url: body.icon_url,
      creator: req.admin._id
    });

    await achievementGroup.save();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "گروه دستاورد با موفقیت ایجاد شد"
    });
  } catch (error) {
    console.error("Error in addAchievementGroup:", error);
    res.status(500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: "خطا در ایجاد گروه دستاورد",
      error: error.message
    });
  }
};

/* get all achievementGroups */
exports.getAchievementGroups = async (req, res) => {
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

    const achievementGroups = await AchievementGroup.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .populate({ path: "game_id", select: "title slug" })
      .populate({ path: "platform_id", select: "name code" })
      .populate({ path: "dlc_id", select: "title slug" })
      .populate({ path: "creator", select: "name avatar" });
    const total = await AchievementGroup.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست گروه دستاورد با موفقیت دریافت شد",
      data: achievementGroups,
      total
    });
  } catch (error) {
    console.error("Error in getAchievementGroups:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت گروه دستاورد",
      description: error.message || error.toString()
    });
  }
};

/* get a achievementGroup */
exports.getAchievementGroup = async (req, res) => {
  const achievementGroup = await AchievementGroup.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "گروه دستاورد با موفقیت دریافت شد",
    data: achievementGroup
  });
};

/* update achievementGroup */
exports.updateAchievementGroup = async (req, res) => {
  const { body } = req;
  const updatedAchievementGroup = {
    status: body.status,
    game_id: body.game_id,
    platform_id: body.platform_id,
    provider: body.provider,
    external_set_id: body.external_set_id,
    external_group_id: body.external_group_id,
    name: body.name,
    group_type: body.group_type,
    dlc_id: body.dlc_id,
    total_achievements: body.total_achievements,
    total_points: body.total_points,
    icon_url: body.icon_url
  };

  await AchievementGroup.findByIdAndUpdate(req.params.id, updatedAchievementGroup, { runValidators: true });

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "گروه دستاورد با موفقیت ویرایش شد"
  });
};

/* delete achievementGroup */
exports.deleteAchievementGroup = async (req, res) => {
  const achievementGroup = await AchievementGroup.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!achievementGroup) {
    return res.status(404).json({
      acknowledgement: false,
      message: "گروه دستاورد پیدا نشد",
      description: "گروه دستاورد که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "گروه دستاورد با موفقیت حذف شد"
  });
};

exports.getAchievementGroupOptions = async (req, res) => {
  const achievementGroups = await AchievementGroup.find().select("name");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست گروه دستاورد با موفقیت دریافت شد",
    data: achievementGroups
  });
};

exports.createAchievementGroup = exports.addAchievementGroup;
