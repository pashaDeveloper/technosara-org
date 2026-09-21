const Store = require("../models/store.model");

/* add new store */
exports.addStore = async (req, res) => {
  try {
    const { body } = req;
    const store = new Store({
      status: body.status,
      code: body.code,
      name: body.name,
      short_name: body.short_name,
      provider: body.provider,
      store_type: body.store_type,
      website_url: body.website_url,
      product_url_template: body.product_url_template,
      logo_url: body.logo_url,
      icon_url: body.icon_url,
      api_available: body.api_available,
      api_base_url: body.api_base_url,
      api_version: body.api_version,
      auth_type: body.auth_type,
      supports_prices: body.supports_prices,
      supports_dlc: body.supports_dlc,
      supports_achievements: body.supports_achievements,
      supports_subscriptions: body.supports_subscriptions,
      supports_reviews: body.supports_reviews,
      default_currency: body.default_currency,
      default_region: body.default_region,
      sort_order: body.sort_order,
      is_active: body.is_active,
      metadata: typeof body.metadata === "string" ? JSON.parse(body.metadata || "{}") : body.metadata,
      creator: req.admin._id
    });

    await store.save();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "فروشگاه با موفقیت ایجاد شد"
    });
  } catch (error) {
    console.error("Error in addStore:", error);
    res.status(500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: "خطا در ایجاد فروشگاه",
      error: error.message
    });
  }
};

/* get all stores */
exports.getStores = async (req, res) => {
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
      query.is_active = req.query.status === "active";
    }

    const stores = await Store.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ created_at: -1 })
      .populate({ path: "creator", select: "name avatar" });
    const total = await Store.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست فروشگاه با موفقیت دریافت شد",
      data: stores,
      total
    });
  } catch (error) {
    console.error("Error in getStores:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت فروشگاه",
      description: error.message || error.toString()
    });
  }
};

/* get a store */
exports.getStore = async (req, res) => {
  const store = await Store.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فروشگاه با موفقیت دریافت شد",
    data: store
  });
};

/* update store */
exports.updateStore = async (req, res) => {
  const { body } = req;
  const updatedStore = {
    status: body.status,
    code: body.code,
    name: body.name,
    short_name: body.short_name,
    provider: body.provider,
    store_type: body.store_type,
    website_url: body.website_url,
    product_url_template: body.product_url_template,
    logo_url: body.logo_url,
    icon_url: body.icon_url,
    api_available: body.api_available,
    api_base_url: body.api_base_url,
    api_version: body.api_version,
    auth_type: body.auth_type,
    supports_prices: body.supports_prices,
    supports_dlc: body.supports_dlc,
    supports_achievements: body.supports_achievements,
    supports_subscriptions: body.supports_subscriptions,
    supports_reviews: body.supports_reviews,
    default_currency: body.default_currency,
    default_region: body.default_region,
    sort_order: body.sort_order,
    is_active: body.is_active,
    metadata: typeof body.metadata === "string" ? JSON.parse(body.metadata || "{}") : body.metadata
  };

  await Store.findByIdAndUpdate(req.params.id, updatedStore, { runValidators: true });

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فروشگاه با موفقیت ویرایش شد"
  });
};

/* delete store */
exports.deleteStore = async (req, res) => {
  const store = await Store.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deleted_at: Date.now() },
    { new: true }
  );

  if (!store) {
    return res.status(404).json({
      acknowledgement: false,
      message: "فروشگاه پیدا نشد",
      description: "فروشگاه که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فروشگاه با موفقیت حذف شد"
  });
};

exports.getStoreOptions = async (req, res) => {
  const stores = await Store.find().select("name code");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست فروشگاه با موفقیت دریافت شد",
    data: stores
  });
};

exports.createStore = exports.addStore;
