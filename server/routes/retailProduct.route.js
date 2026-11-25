const router = require('express').Router();
const mongoose = require('mongoose');
const Product = require('../models/retailProduct.model');
const Review = require('../models/retailReview.model');
const references = require('../models/retailReferences.models');
const catalog = require('../services/catalog.service');

const publicFields = 'title summary price condition thumbnail gallery features variations campaign brand store category';
const publicProducts = { status: { $in: ['active', null] }, isDeleted: { $ne: true } };
const referenceFields = 'title description thumbnail logo keynotes tags';
const populateReferences = ['brand', 'store', 'category'].map(path => ({ path, select: referenceFields }));
const productReference = { brands: 'brand', stores: 'store', categories: 'category' };

router.get('/references/:group/:id?', async (req, res, next) => {
  try {
    const { group, id } = req.params;
    if (!Object.hasOwn(references, group) || (id && !mongoose.isObjectIdOrHexString(id))) {
      throw catalog.fail('Retail reference not found', 404);
    }
    const Model = references[group];
    const query = id ? Model.findById(id) : Model.find().sort({ title: 1, _id: 1 }).limit(100);
    const records = await query.select(referenceFields).lean();
    if (!records) throw catalog.fail('Retail reference not found', 404);
    const entries = id ? [records] : records;
    const field = productReference[group];
    const products = await Product.find({ ...publicProducts, [field]: { $in: entries.map(entry => entry._id) } })
      .select(`title summary price thumbnail campaign ${field}`).sort({ createdAt: -1, _id: -1 }).lean();
    const byReference = new Map();
    for (const product of products) {
      const key = String(product[field]);
      if (!byReference.has(key)) byReference.set(key, []);
      byReference.get(key).push(product);
    }
    const data = entries.map(entry => ({ ...entry, products: byReference.get(String(entry._id)) || [] }));
    res.json({ acknowledgement: true, data: id ? data[0] : data });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const { brand, store, category, search, condition, limit } = req.query;
    if (condition !== undefined && condition !== 'stock') throw catalog.fail('Invalid product condition');
    const query = catalog.filters(Product, Object.fromEntries(
      Object.entries({ brand, store, category, search }).filter(([, value]) => value && value !== 'null')
    ));
    Object.assign(query, publicProducts);
    if (condition === 'stock') {
      const stock = { $or: [
        { condition: { $in: ['used', 'refurbished'] } },
        { condition: null, 'campaign.state': { $in: ['on-sale', 'discount'] } },
      ] };
      query.$and = [stock];
      query['campaign.state'] = { $ne: 'sold-out' };
    }
    const size = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 24));
    const data = await Product.find(query).select(publicFields).populate(populateReferences)
      .sort({ createdAt: -1, _id: -1 }).limit(size).lean();
    res.json({ acknowledgement: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isObjectIdOrHexString(req.params.id)) throw catalog.fail('Product not found', 404);
    const data = await Product.findOne({ ...publicProducts, _id: req.params.id })
      .select(publicFields).populate(populateReferences).lean();
    if (!data) throw catalog.fail('Product not found', 404);
    const reviews = await Review.find({ product: data._id }).select('rating comment createdAt').sort({ createdAt: -1 }).lean();
    res.json({ acknowledgement: true, data: { ...data, reviews } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
