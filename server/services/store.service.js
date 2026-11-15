const Store = require("../models/store.model");

const extraFields = ["short_name","provider","store_type","website_url","product_url_template","logo_url","icon_url","api_available","api_base_url","api_version","auth_type","supports_prices","supports_dlc","supports_achievements","supports_subscriptions","supports_reviews","default_currency","default_region","metadata"];
function storeValues(body) {
  const values = Object.fromEntries(extraFields.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
  if (body.country_code !== undefined) values.country_code = body.country_code === '' ? null : body.country_code;
  if (typeof values.metadata === 'string') {
    try { values.metadata = JSON.parse(values.metadata || '{}'); }
    catch { throw Object.assign(new Error('متادیتا باید JSON معتبر باشد.'), { status: 400 }); }
  }
  return values;
}

exports.getStoreCountries = (req, res) => res.status(200).json({
  acknowledgement: true, data: require('../utils/country.util').countries,
});

/* add new store */
exports.addStore = async (req, res) => {
  try {
    const { body } = req;
    const lastStore = await Store.findOne().sort({ sort_order: -1 }).select('sort_order');
    const store = new Store({
      ...storeValues(body),
      ...req.uploadedImageValues,
    status: body.status,
      name: body.name,
      name_fa: body.name_fa,
      name_en: body.name_en,
      image: body.image,
      code: body.code,
      description: body.description,
      sort_order: (lastStore?.sort_order ?? -1) + 1,
      is_active: body.is_active,
      creator: req.admin._id
    });

    await store.save();
    req.commitUploads?.();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "فروشگاه با موفقیت ایجاد شد"
    });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ message: error.message });
    console.error("Error in addStore:", error);
    res.status(error.name === 'ValidationError' ? 400 : error.code === 11000 ? 409 : 500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: error.code === 11000 ? 'این کد قبلاً استفاده شده است.' : error.name === 'ValidationError' ? Object.values(error.errors).map(item => item.message).join('؛ ') : 'خطا در ایجاد فروشگاه',
      error: error.message
    });
  }
};

/* get all stores */
exports.getStores = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 5));
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (typeof search === 'string' && search) {
      const pattern = search.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = ['name', 'name_en', 'code'].map(key => ({ [key]: { $regex: pattern, $options: 'i' } }));
    }
    if (req.query.status) {
      query.is_active = req.query.status === "active";
    }

    const stores = await Store.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ sort_order: 1, _id: 1 })
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
  if (!store) return res.status(404).json({ acknowledgement: false, message: "فروشگاه پیدا نشد" });
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
    ...storeValues(body),
      ...req.uploadedImageValues,
    status: body.status,
    name: body.name,
      name_fa: body.name_fa,
    name_en: body.name_en,
    ...(body.image !== undefined ? { image: body.image } : {}),
    code: body.code,
    description: body.description,
    is_active: body.is_active
  };

  const saved = await Store.findByIdAndUpdate(req.params.id, updatedStore, { runValidators: true });
  if (!saved) return res.status(404).json({ acknowledgement: false, message: "Record not found" });
  await require('../utils/imageUpload').finishImageReplacement(req, res, saved.image_storage);

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
  const stores = await Store.find().sort({ sort_order: 1, _id: 1 }).select("name name_fa name_en code");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست فروشگاه با موفقیت دریافت شد",
    data: stores
  });
};

exports.createStore = exports.addStore;

exports.reorderStore = async (req, res) => {
  const { id, targetId } = req.body;
  if (![id, targetId].every(value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)) || id === targetId) {
    return res.status(400).json({ acknowledgement: false, message: 'جابجایی معتبر نیست' });
  }
  const stores = await Store.find({ isDeleted: { $ne: true } }).sort({ sort_order: 1, _id: 1 }).select('_id').lean();
  const from = stores.findIndex(item => String(item._id) === id);
  const to = stores.findIndex(item => String(item._id) === targetId);
  if (from < 0 || to < 0) {
    return res.status(404).json({ acknowledgement: false, message: 'فروشگاه پیدا نشد' });
  }
  const [moved] = stores.splice(from, 1);
  stores.splice(to, 0, moved);
  await Store.bulkWrite(stores.map((item, index) => ({
    updateOne: { filter: { _id: item._id }, update: { $set: { sort_order: index } } }
  })));
  res.status(200).json({ acknowledgement: true, description: 'ترتیب فروشگاهها ذخیره شد' });
};
