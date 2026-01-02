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
  qunLeft: {
    type: Number
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
  // batchId: String,
  expireDate: Date
}, { _id: false });

const additionalChargeSchema = new mongoose.Schema({
  particular: {
    type: String
  },
  amount: {
    type: String
  }
}, { _id: false });

const purchaseInvoiceSchema = new mongoose.Schema({
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
  purchaseInvoiceNumber: {
    type: String,
    required: true
  },
  originalInvoiceNumber: {
    type: String,
    required: true
  },
  invoiceDate: {
    type: Date,
    required: true
  },
  validDate: {
    type: Date
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
  paymentStatus: {
    type: String,
    required: true,
    enum: ['0', '1'], // 0=`Notpaid` |  1=`Paid`
    default: '0'
  },
  paymentAccount: {
    type: String
  },
  dueAmount: {
    type: Number
  },
  note: {
    type: String,
  },
  terms: {
    type: String,
  },
  batchId: String,
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

module.exports = mongoose.model("purchaseinvoice", purchaseInvoiceSchema);
