const mongoose = require("mongoose");


const itemSchema = new mongoose.Schema({
  itemId: String,
  itemName: {
    type: String
  },
  description: {
    type: String
  },
  hsn: {
    type: String,
  },
  qun: {
    type: String
  },
  selectedUnit: {
    type: String
  },
  unit: {
    type: Array
  },
  price: {
    type: String
  },
  discountPerAmount: {
    type: String
  },
  discountPerPercentage: {
    type: String
  },
  tax: {
    type: String
  },
  taxAmount: {
    type: String
  },
  amount: {
    type: String
  },
}, { _id: false });

const additionalChargeSchema = new mongoose.Schema({
  particular: {
    type: String
  },
  amount: {
    type: String
  }
}, { _id: false });

const purchaseReturnSchema = new mongoose.Schema({
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
  purchaseReturnNumber: {
    type: String,
    required: true
  },
  returnInvoiceNumber: Object,
  returnDate: {
    type: Date,
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

module.exports = mongoose.model("purchasereturn", purchaseReturnSchema);
