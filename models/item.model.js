const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: true
  },
  type: String, // item Type
  hsn: String,
  tax: String,
  salePrice: String,
  saleTaxType: {
    type: String,
    enum: ["0", "1"] //0=`Without Tax` | 1=`With Tax`
  },
  purchasePrice: String,
  purchaseTaxType: {
    type: String,
    enum: ["0", "1"] //0=`Without Tax` | 1=`With Tax`
  },
  itemCode: String, // Item Barcode Number;
  barcodeImage: String, // Path to the barcode image
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'category',
    default: null
  },
  details: {
    type: String,
  },
  unit: {
    type: [],
    required: true
  },
  stock: {
    type: [],
    default: 0
  },
  alert: {
    type: [],
    default: 0
  },
  isDel: {
    type: Boolean,
    default: false
  },
  isTrash: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });


const itemModel = new mongoose.model("item", itemSchema);
module.exports = itemModel;

