const mongoose = require('mongoose');
const baseSchema = require('./baseSchema.model');
const {
  countryCodes
} = require('../utils/country.util');
const schema = new mongoose.Schema({
  ...baseSchema.obj,
  name: {
    type: String,
    required: function () {
      return !this.name_en;
    },
    trim: true
  },
  name_en: {
    type: String,
    trim: true,
    default: undefined
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  type: {
    type: String,
    enum: ['developer', 'publisher', 'developer_publisher'],
    required: true
  },
  website: {
    type: String,
    trim: true,
    default: null
  },
  founded_year: {
    type: Number,
    default: null,
    min: 1000,
    validate: {
      validator: value => value == null || Number.isInteger(value) && value <= new Date().getFullYear(),
      message: 'سال تأسیس باید یک سال میلادی معتبر تا سال جاری باشد'
    }
  },
  founded_date: {
    type: String,
    default: null,
    validate: {
      validator: value => {
        if (value == null) return true;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(`${value}T00:00:00.000Z`);
        return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value && Number(value.slice(0, 4)) >= 1000 && value <= new Date().toLocaleDateString('en-CA');
      },
      message: 'تاریخ تأسیس معتبر و حداکثر تا امروز وارد کنید'
    }
  },
  founders: {
    type: [new mongoose.Schema({
      person_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Person'
      },
      name: {
        type: String,
        trim: true,
        required: true
      }
    }, {
      _id: false
    })],
    default: []
  },
  key_members: {
    type: [new mongoose.Schema({
      person_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Person'
      },
      name: {
        type: String,
        trim: true,
        required: true
      },
      role: {
        type: String,
        trim: true,
        default: ''
      }
    }, {
      _id: false
    })],
    default: []
  },
  logo: {
    type: String,
    trim: true,
    default: null
  },
  country_code: {
    type: String,
    trim: true,
    uppercase: true,
    enum: [...countryCodes, null],
    default: null
  }
}, {
  timestamps: true
});
schema.plugin(require('../utils/catalogImage').catalogImage, {
  category: 'companies',
  field: 'logo'
});
schema.add({
  name_fa: {
    type: String,
    trim: true,
    default: undefined
  }
});
module.exports = mongoose.model('Company', schema);
