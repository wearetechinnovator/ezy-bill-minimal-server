const mongoose = require("mongoose");

const partySchema = new mongoose.Schema({
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
  name: {
    type: String,
    required: true
  },
  partyCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PartyCategory",
    defult: null
  },
  type: {
    type: String,
    enum: ['supplier', 'customer', 'both'], // Party types
    default: 'customer'
  },
  contactNumber: String,
  email: {
    type: String,
  },
  billingAddress: String,
  pan: String,
  gst: String,
  billingCountry: String,
  billingState: String,
  shippingAddress: String,
  shippingCountry: String,
  shippingState: String,
  openingBalance: {
    type: Number,
    default: 0
  },
  creditLimit: {
    type: Number,
    default: 0
  },
  creditPeriod: {
    type: String,
    default: 0
  },
  dob: Date,
  details: String,
  isDel: {
    type: Boolean,
    default: false
  },
  isTrash: {
    type: Boolean,
    default: false
  }

}, { timestamps: true });


const partyModel = new mongoose.model("party", partySchema);
module.exports = partyModel;
