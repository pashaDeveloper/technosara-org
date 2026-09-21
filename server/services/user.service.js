const User = require("../models/user.model");
const bcrypt = require("bcryptjs");

/* add new user */
exports.addUser = async (req, res) => {
  try {
    const { body } = req;
    const user = new User({
      status: body.status,
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role,
      creator: req.admin._id
    });

    await user.save();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "کاربر با موفقیت ایجاد شد"
    });
  } catch (error) {
    console.error("Error in addUser:", error);
    res.status(500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: "خطا در ایجاد کاربر",
      error: error.message
    });
  }
};

/* get all users */
exports.getUsers = async (req, res) => {
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

    const users = await User.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .populate({ path: "creator", select: "name avatar" });
    const total = await User.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست کاربر با موفقیت دریافت شد",
      data: users,
      total
    });
  } catch (error) {
    console.error("Error in getUsers:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت کاربر",
      description: error.message || error.toString()
    });
  }
};

/* get a user */
exports.getUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "کاربر با موفقیت دریافت شد",
    data: user
  });
};

/* update user */
exports.updateUser = async (req, res) => {
  const { body } = req;
  const updatedUser = {
    status: body.status,
    name: body.name,
    email: body.email,
    password: body.password,
    role: body.role
  };
  if (body.password) {
    updatedUser.password = await bcrypt.hash(body.password, 12);
  }

  await User.findByIdAndUpdate(req.params.id, updatedUser, { runValidators: true });

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "کاربر با موفقیت ویرایش شد"
  });
};

/* delete user */
exports.deleteUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!user) {
    return res.status(404).json({
      acknowledgement: false,
      message: "کاربر پیدا نشد",
      description: "کاربر که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "کاربر با موفقیت حذف شد"
  });
};

exports.getUserOptions = async (req, res) => {
  const users = await User.find().select("name email");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست کاربر با موفقیت دریافت شد",
    data: users
  });
};

exports.createUser = exports.addUser;
