const token = require("../utils/token.util");
const Admin = require("../models/admin.model");

const OWNER_ROLES = ["superAdmin"];

exports.needsSetup = async () => {
  return !(await Admin.collection.findOne({}, { projection: { _id: 1 } }));
};

exports.signUp = async (req, res) => {
  const { body } = req;
  const { name, email, password, avatarUrl } = body;

  if (!name || !email || !password) {
    return res.status(400).json({
      acknowledgement: false,
      message: "درخواست نادرست",
      description: "همه فیلدها الزامی است",
      isSuccess: false
    });
  }

  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    return res.status(409).json({
      acknowledgement: false,
      isSuccess: false,
      message: "ایمیل تکراری است",
      description:
        "کاربری با این ایمیل قبلاً ثبت‌نام کرده است. لطفاً به صفحه ورود بروید.",
      redirectToLogin: true
    });
  }

  let avatar;
  if (
    req.uploadedFiles &&
    req.uploadedFiles["avatar"] &&
    req.uploadedFiles["avatar"].length > 0
  ) {
    avatar = {
      blur: req.uploadedFiles["avatar"][0].blur,
      url: req.uploadedFiles["avatar"][0].url,
      public_id: req.uploadedFiles["avatar"][0].key,
      storage: req.uploadedFiles["avatar"][0].storage || "",
      copies: req.uploadedFiles["avatar"][0].copies
    };
  } else {
    avatar = {
      url: avatarUrl || "",
      public_id: null,
      storage: ""
    };
  }

  if (!avatar.url) {
    return res.status(400).json({
      acknowledgement: false,
      message: "Bad Request",
      description: "Avatar is required for admin sign-up",
      isSuccess: false
    });
  }

  const first = await exports.needsSetup();
  const admin = await Admin.create({
    name, email, password, avatar,
    creator: req.admin?._id || null,
    role: first ? 'superAdmin' : 'admin',
    status: first ? 'active' : 'inactive',
  });

  req.commitUploads?.();
  res.status(201).json({
    acknowledgement: true,
    message: "تبریک ",
    description: "ثبت‌نام با موفقیت انجام شد",
    isSuccess: true
  });

  return admin;
};

exports.signIn = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({
      acknowledgement: false,
      message: "Bad Request",
      description: "ایمیل و رمز عبور را وارد کنید",
    });
  }

  const admin = await Admin.findOne({
    email: email.trim().toLowerCase(),
  }).select("+password");

  if (!admin) {
    return res.status(401).json({
      acknowledgement: false,
      message: "Unauthorized",
      description: "ایمیل یا رمز عبور صحیح نیست یا حساب غیرفعال است",
    });
  }

  const isPasswordValid = await admin.comparePassword(password);

  if (!isPasswordValid) {
    return res.status(401).json({
      acknowledgement: false,
      message: "Unauthorized",
      description: "ایمیل یا رمز عبور صحیح نیست یا حساب غیرفعال است",
    });
  }

  if (admin.status === "inactive") {
    return res.status(401).json({
      acknowledgement: false,
      message: "Unauthorized",
      description: "حساب شما در حال حاضر غیرفعال است"
    });
  }

  const accessToken = token({
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    status: admin.status,
  });

  return res.status(200).json({
    acknowledgement: true,
    message: "OK",
    description: "با موفقیت وارد شدید",
    accessToken,
    token: accessToken,
    data: { id: String(admin._id), name: admin.name, email: admin.email, role: admin.role },
  });
};

/* delete admin information */
exports.deleteAdmin = async (req, res) => {
  const existingAdmin = await Admin.findById(req.params.id);

  if (!existingAdmin) {
    return res.status(404).json({
      acknowledgement: false,
      message: "کاربر یافت نشد"
    });
  }

  if (OWNER_ROLES.includes(existingAdmin.role)) {
    return res.status(403).json({
      acknowledgement: false,
      message: "ممنوع",
      description: "کاربر مدیر کل قابل حذف نیست"
    });
  }

  const admin = await Admin.findOneAndUpdate(
    { _id: existingAdmin._id, role: { $nin: OWNER_ROLES } },
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!admin) {
    return res.status(404).json({ acknowledgement: false, message: "کاربر یافت نشد" });
  }

  return res.status(200).json({
    acknowledgement: true,
    message: "OK",
    description: `کاربر ${admin.name} با موفقیت حذف شد`
  });
};

/* update admin information */
exports.updateAdmin = async (req, res) => {
  const existingAdmin = await Admin.findById(req.admin._id);
  const admin = req.body || {};

  if (!existingAdmin) {
    return res.status(404).json({ acknowledgement: false, message: "کاربر یافت نشد" });
  }

  if (OWNER_ROLES.includes(existingAdmin.role) || admin.role !== undefined) {
    return res.status(403).json({
      acknowledgement: false,
      message: "Forbidden",
      description: "کاربر مدیر کل و نقش کاربر قابل ویرایش نیست"
    });
  }

  // Only profile fields may be changed through this endpoint.
  const changes = {};
  const uploadedAvatar = req.uploadedFiles?.avatar?.[0];
  if (uploadedAvatar) changes.avatar = {
    url: uploadedAvatar.url, public_id: uploadedAvatar.key, storage: uploadedAvatar.storage,
    blur: uploadedAvatar.blur, copies: uploadedAvatar.copies,
  };
  if (admin.name !== undefined) changes.name = admin.name;
  if (admin.email !== undefined) changes.email = admin.email;


  let updatedAdmin;
  try {
    updatedAdmin = await Admin.findOneAndUpdate(
      { _id: existingAdmin._id, role: { $nin: OWNER_ROLES }, __v: existingAdmin.__v },
      { $set: changes, $inc: { __v: 1 } },
      { runValidators: true, new: true }
    );
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ acknowledgement: false, message: "این ایمیل قبلاً ثبت شده است" });
    }
    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({ acknowledgement: false, message: "اطلاعات واردشده معتبر نیست" });
    }
    throw error;
  }

  if (!updatedAdmin) {
    return res.status(404).json({ acknowledgement: false, message: "کاربر یافت نشد" });
  }

  req.commitUploads?.();
  return res.status(200).json({
    acknowledgement: true,
    message: "OK",
    description: `اطلاعات ${updatedAdmin.name} با موفقیت تغییر کرد`
  });
};

exports.persistLogin = async (req, res) => {
  const admin = await Admin.findById(req.admin._id).select("-password");

  if (!admin || admin.status !== "active") {
    return res.status(401).json({
      acknowledgement: false,
      message: "Not Found",
      description: "کاربر یافت نشد"
    });
  }

  return res.status(200).json({
    acknowledgement: true,
    message: "OK",
    description: "ورود با موفقیت انجام شد",
    data: require('./profile.service').serialize(admin)
  });
};
