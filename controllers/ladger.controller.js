const { getId } = require("../helper/getIdFromToken");
const ladgerModel = require("../models/ladger.model");
const userModel = require("../models/user.model");



// This Add Controller not used for API calling;
// ============================================
const addLadger = async (token, voucher, credit, debit, transactionNo, partyId) => {
  if ([token, voucher, transactionNo, partyId].some((field) => !field || field === "")) {
    console.log("require*")
    return false;
  }

  try {
    const getInfo = await getId(token);
    const getUserData = await userModel.findOne({ _id: getInfo._id });


    const getBalance = await ladgerModel.findOne({
      userId: getUserData._id,
      companyId: getUserData.activeCompany,
      partyId
    }).sort({ _id: -1 });


    let balance = parseInt(getBalance?.balance || 0);

    // Apply credit or debit regardless of current balance;
    if (credit > 0) {
      balance += parseInt(credit);
    }

    if (debit > 0) {
      balance -= parseInt(debit);
    }

    // insert ladger
    const insert = await ladgerModel.create({
      userId: getUserData._id, companyId: getUserData.activeCompany,
      voucher, credit, debit, transactionNo, partyId, balance: balance
    })

    if (!insert) {
      console.log('not insert')
      return false;
    }

    return true;

  } catch (error) {
    console.log('carth error: ', error)
    return false;
  }

}




const get = async (req, res) => {
  const { token, partyId } = req.body;
  const { page, limit } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  if (!token || !partyId) {
    res.status(500).json({ err: "invalid user" })
  }

  try {
    const getInfo = await getId(token);
    const getUser = await userModel.findOne({ _id: getInfo._id });

    const totalData = await ladgerModel.countDocuments({
      partyId, companyId: getUser.activeCompany,
      userId: getInfo._id
    });


    const getLadger = await ladgerModel.find({
      partyId, companyId: getUser.activeCompany,
      userId: getInfo._id
    }).skip(skip).limit(limit)

    if (!getLadger) {
      return res.status(500).json({ err: "No Ladger Found" })
    }


    return res.status(200).json({ data: getLadger, totalData });

  } catch (error) {
    console.log("Ladger Error: ", error);
    res.status(500).json({ err: "Something went wrong" });
  }

}




module.exports = {
  addLadger, get
}
