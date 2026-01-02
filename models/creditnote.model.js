const mongoose = require("mongoose");


const itemSchema = new mongoose.Schema({
  itemId: String,
  itemName: String,
  description: String,
  hsn: String,
  qun: String,
  selectedUnit: String,
  unit: {
    type: Array
  },
  price: String,
  discountPerAmount: String,
  discountPerPercentage: String,
  tax: String,
  taxAmount: String,
  amount: String,
}, { _id: false });

const additionalChargeSchema = new mongoose.Schema({
  particular: String,
  amount: String
}, { _id: false });

const creditNoteSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true
  },
  party: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'party',
    required: true
  },
  creditNoteNumber: {
    type: String,
    required: true
  },
  creditNoteDate: {
    type: Date,
    required: true
  },
  items: {
    type: [itemSchema],
    required: true
  },
  discountType: {
    type: String,
  },
  discountAmount: {
    type: String,
  },
  discountPercentage: {
    type: String,
  },
  additionalCharge: {
    type: [additionalChargeSchema],
  },
  note: {
    type: String,
  },
  terms: {
    type: String,
  },
  isDel: {
    type: Boolean,
    default: false
  },
  isTrash: {
    type: Boolean,
    default: false
  },
  finalAmount: Number,
  autoRoundOff: Boolean,
  roundOffAmount: Number,
  roundOffType: {
    type: String,
    enum: ['0', '1'] // 1 =`add` | 0 =`reduce`
  }
}, { timestamps: true });

module.exports = mongoose.model("creditnote", creditNoteSchema);
