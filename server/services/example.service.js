const Example = require("../models/example.model");

/* add new example */
exports.addExample = async (req, res) => {
  try {
    const { body } = req;
    const example = new Example({
      status: body.status,
      title: body.title,
      description: body.description,
      creator: req.admin._id
    });

    await example.save();

    res.status(201).json({
      acknowledgement: true,
      message: "Created",
      description: "نمونه با موفقیت ایجاد شد"
    });
  } catch (error) {
    console.error("Error in addExample:", error);
    res.status(500).json({
      acknowledgement: false,
      message: "Internal Server Error",
      description: "خطا در ایجاد نمونه",
      error: error.message
    });
  }
};

/* get all examples */
exports.getExamples = async (req, res) => {
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

    const examples = await Example.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 })
      .populate({ path: "creator", select: "name avatar" });
    const total = await Example.countDocuments(query);

    res.status(200).json({
      acknowledgement: true,
      message: "Ok",
      description: "فهرست نمونه با موفقیت دریافت شد",
      data: examples,
      total
    });
  } catch (error) {
    console.error("Error in getExamples:", error);
    return res.status(500).json({
      acknowledgement: false,
      message: "خطا در دریافت نمونه",
      description: error.message || error.toString()
    });
  }
};

/* get a example */
exports.getExample = async (req, res) => {
  const example = await Example.findById(req.params.id);
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "نمونه با موفقیت دریافت شد",
    data: example
  });
};

/* update example */
exports.updateExample = async (req, res) => {
  const { body } = req;
  const updatedExample = {
    status: body.status,
    title: body.title,
    description: body.description
  };

  await Example.findByIdAndUpdate(req.params.id, updatedExample, { runValidators: true });

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "نمونه با موفقیت ویرایش شد"
  });
};

/* delete example */
exports.deleteExample = async (req, res) => {
  const example = await Example.findByIdAndUpdate(
    req.params.id,
    { isDeleted: true, deletedAt: Date.now() },
    { new: true }
  );

  if (!example) {
    return res.status(404).json({
      acknowledgement: false,
      message: "نمونه پیدا نشد",
      description: "نمونه که می‌خواهید حذف کنید، وجود ندارد"
    });
  }

  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "نمونه با موفقیت حذف شد"
  });
};

exports.getExampleOptions = async (req, res) => {
  const examples = await Example.find().select("title");
  res.status(200).json({
    acknowledgement: true,
    message: "Ok",
    description: "فهرست نمونه با موفقیت دریافت شد",
    data: examples
  });
};

exports.createExample = exports.addExample;
