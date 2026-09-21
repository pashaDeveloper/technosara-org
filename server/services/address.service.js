const Address = require("../models/address.model");

/* add new address */
exports.addAddress = async (req, res) => {
  try {
    const { body } = req;
    const address = new Address({
      status: body.status,
      province: body.province,
      city: body.city,
      address: body.address,
      plateNumber: body.plateNumber,
      postalCode: body.postalCode,
      creator: req.admin._id
    });

    await address.save();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "آدرس با موفقیت ایجاد شد"
    });
  } catch (error) {
    console.error("Error in addAddress:", error);
    res.status(500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: "خطا در ایجاد آدرس",
      error: error.message
    });
  }
};

/* get all addresses */
exports.getAddresses = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 5;
    const skip = (pageNum - 1) * limitNum;

    const query = {};
    if (search) {
      query.address = { $regex: search, $options: "i" };
    }
    if (req.query.status) {
      query.status = req.query.status;
    }

    const addresses = await Address.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .populate({ path: "creator", select: "name avatar" });
    const total = await Address.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست آدرس با موفقیت دریافت شد",
      data: addresses,
      total
    });
  } catch (error) {
    console.error("Error in getAddresses:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت آدرس",
      description: error.message || error.toString()
    });
  }
};

/* get a address */
exports.getAddress = async (req, res) => {
  const address = await Address.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "آدرس با موفقیت دریافت شد",
    data: address
  });
};

/* update address */
exports.updateAddress = async (req, res) => {
  const { body } = req;
  const updatedAddress = {
    status: body.status,
    province: body.province,
    city: body.city,
    address: body.address,
    plateNumber: body.plateNumber,
    postalCode: body.postalCode
  };

  await Address.findByIdAndUpdate(req.params.id, updatedAddress, { runValidators: true });

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "آدرس با موفقیت ویرایش شد"
  });
};

/* delete address */
exports.deleteAddress = async (req, res) => {
  const address = await Address.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!address) {
    return res.status(404).json({
      acknowledgement: false,
      message: "آدرس پیدا نشد",
      description: "آدرس که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "آدرس با موفقیت حذف شد"
  });
};

exports.getAddressOptions = async (req, res) => {
  const addresses = await Address.find().select("address");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست آدرس با موفقیت دریافت شد",
    data: addresses
  });
};

exports.createAddress = exports.addAddress;
