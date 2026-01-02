const { default: mongoose } = require("mongoose");
const { getId } = require("../helper/getIdFromToken");
const paymentOutModel = require("../models/paymentout.model");
const purchaseInvoiceModel = require("../models/purchaseInvoice.model");
const userModel = require("../models/user.model");
const { addLadger } = require("./ladger.controller");
const Log = require("../helper/insertLog");


const add = async (req, res) => {
  const { token, party, paymentOutNumber, paymentOutDate, checkedInv,
    paymentMode, account, amount, details, update, id, dueAmount, invoiceId
  } = req.body;

  if ([token, party, paymentOutNumber, paymentOutDate, paymentMode, account, amount]
    .some((field) => field === "")) {
    return res.status(400).json({ msg: "Fill the required fields" });
  }


  try {
    const getInfo = await getId(token);
    const getUserData = await userModel.findOne({ _id: getInfo._id });

    const isExist = await paymentOutModel.findOne({
      userId: getInfo._id, companyId: getUserData.activeCompany, paymentOutNumber: paymentOutNumber,
      isDel: false
    });
    if (isExist && !update) {
      return res.status(500).json({ err: 'Payment alredy exist', create: false })
    }

    // update code.....
    if (update && id) {
      const update = await paymentOutModel.updateOne({ _id: id }, {
        $set: {
          party, paymentOutNumber, paymentOutDate, paymentMode, account, amount, details
        }
      })

      if (!update) {
        return res.status(500).json({ err: 'Payment update failed', update: false })
      }

      return res.status(200).json(update)

    } // Update close here;


    // :::::::: update Purchase amount :::::::;
    let finalAmount = amount;
    checkedInv.forEach(async (inv, _) => {
      let due = parseFloat(inv.dueAmount) - parseFloat(finalAmount);
      finalAmount = parseFloat(finalAmount) - parseFloat(inv.dueAmount);

      const updateData = {
        dueAmount: due.toString()
      };

      if (due === 0) {
        updateData.paymentStatus = '1';
      }
      else if (due > 0) {
        updateData.paymentStatus = '2';
      }

      await purchaseInvoiceModel.updateOne(
        { purchaseInvoiceNumber: inv.purchaseInvoiceNumber },
        { $set: updateData }
      );
    });


    // update Due amount;
    // const finalAmount = parseFloat(dueAmount) - parseFloat(amount);
    // if (finalAmount === 0) {
    //   await purchaseInvoiceModel.updateOne({ purchaseInvoiceNumber: invoiceId }, {
    //     $set: {
    //       dueAmount: finalAmount,
    //       paymentStatus: '1'
    //     }
    //   })
    // } else {
    //   await purchaseInvoiceModel.updateOne({ purchaseInvoiceNumber: invoiceId }, {
    //     $set: {
    //       dueAmount: finalAmount
    //     }
    //   })
    // }

    // add extra amount in ladger as dr.;
    if (finalAmount > 0) {
      await addLadger(token, "Purchase", 0, finalAmount, paymentOutNumber, party);
    }


    const insert = await paymentOutModel.create({
      userId: getUserData._id, companyId: getUserData.activeCompany,
      party, paymentOutNumber, paymentOutDate, paymentMode, account, amount, details
    });

    if (!insert) {
      return res.status(500).json({ err: 'Payment creation failed', create: false })
    }

    const ladger = await addLadger(token, 'Purchase', amount, 0, paymentOutNumber, party);
    if (!ladger) {
      return res.status(500).json({ err: 'Ladger entry failed' });
    }

    // Insert partylog;
    await Log.insertPartyLog(token, insert._id, party, "Paymentout", amount, "", 'paymentout');

    return res.status(200).json(insert);

  } catch (error) {
    console.log(error)
    return res.status(500).json({ 'err': 'Something went wrong', create: false });
  }


}


// Get Controller;
const get = async (req, res) => {
  const { token, trash, id, all, totalPayment } = req.body;
  const { page, limit } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  if (!token) {
    return res.status(500).json({ 'err': 'Invalid user', get: false });
  }

  try {
    const getInfo = await getId(token);
    const getUser = await userModel.findOne({ _id: getInfo._id });
    const totalData = await paymentOutModel.countDocuments({
      companyId: getUser.activeCompany,
      isTrash: trash ? true : false,
      isDel: false
    });

    let getData;
    if (id) {
      getData = await paymentOutModel.findOne({
        companyId: getUser.activeCompany,
        _id: id,
        isTrash: false,
        isDel: false
      });
    }
    else if (trash) {
      getData = await paymentOutModel.find({
        companyId: getUser.activeCompany,
        isTrash: trash ? true : false,
        isDel: false
      }).skip(skip).limit(limit).sort({ _id: -1 }).populate("party");;
    }
    else if (all) {
      getData = await paymentOutModel.find({
        companyId: getUser.activeCompany,
        isDel: false
      }).skip(skip).limit(limit).sort({ _id: -1 }).populate("party");;
    }
    else {
      if (totalPayment) {
        data = await paymentOutModel.find({ isDel: false, isTrash: false, companyId: getUser.activeCompany });

        // let totalAmount = 0;
        // data.forEach((d, _) => {
        //   totalAmount += parseInt(d.amount)
        // })

        const total = data.reduce((acc, i) => {
          acc += parseInt(i.amount);
          return acc;
        }, 0)

        return res.status(200).json({ totalAmount: total });

      }


      getData = await paymentOutModel.find({
        companyId: getUser.activeCompany,
        isTrash: false,
        isDel: false
      }).skip(skip).limit(limit).sort({ _id: -1 }).populate("party");
    }

    if (!getData) {
      return res.status(500).json({ 'err': 'No party availble', get: false });
    }

    return res.status(200).json({ data: getData, totalData: totalData });

  } catch (error) {
    console.log(error)
    return res.status(500).json({ 'err': 'Something went wrong', get: false });
  }

}

// Delete controller
const remove = async (req, res) => {
  const { ids, trash } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ err: "No valid IDs provided", remove: false });
  }

  try {
    let updateQuery;
    if (trash) {
      updateQuery = { $set: { isTrash: true } };
    } else {
      updateQuery = { $set: { isDel: true } };
    }

    const removeParty = await paymentOutModel.updateMany(
      { _id: { $in: ids } },
      updateQuery
    );

    if (removeParty.matchedCount === 0) {
      return res.status(404).json({ err: "No matching parties found", remove: false });
    }

    return res.status(200).json({
      msg: trash
        ? "Payment added to trash successfully"
        : "Payment deleted successfully",
      modifiedCount: removeParty.modifiedCount,
    });

  } catch (error) {
    return res.status(500).json({ err: "Something went wrong", remove: false });
  }

};


// Resoter from trash
const restore = async (req, res) => {
  const { ids } = req.body;

  if (ids.length === 0) {
    return res.status(500).json({ err: 'require fields are empty', restore: false });
  }

  try {
    const restoreData = await paymentOutModel.updateMany({ _id: { $in: ids } }, {
      $set: {
        isTrash: false
      }
    })

    if (restoreData.matchedCount === 0) {
      return res.status(404).json({ err: "No tax restore", restore: false });
    }

    return res.status(200).json({ msg: 'Restore successfully', restore: true })


  } catch (error) {
    return res.status(500).json({ err: "Something went wrong", restore: false });
  }
}



const filter = async (req, res) => {
  const {
    token, productName, fromDate, toDate, billNo, party, gst, billDate
  } = req.body;
  const { page, limit } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);


  if (!token) {
    return res.status(500).json({ 'err': 'Invalid user', get: false });
  }

  const getInfo = await getId(token);
  const getUser = await userModel.findOne({ _id: getInfo._id });

  const query = { companyId: getUser.activeCompany };
  if (productName) {
    query["items.itemName"] = productName
  }
  if (billNo) {
    query['paymentOutNumber'] = billNo
  }
  if (billDate) {
    query['paymentOutDate'] = billDate;
  }


  if (fromDate && toDate) {
    console.log(`fromDate ${fromDate}\ntoDate ${toDate}`)
    query["paymentOutDate"] = {
      $gte: new Date(fromDate),
      $lte: new Date(toDate)
    }
  } else if (fromDate) {
    query["paymentOutDate"] = {
      $gte: new Date(fromDate)
    }
  } else if (toDate) {
    query["paymentOutDate"] = {
      $lte: new Date(toDate)
    }
  }

  let totalData = await paymentOutModel.find({ ...query, isDel: false }).countDocuments();
  let allData = await paymentOutModel.find({ ...query, isDel: false }).skip(skip).limit(limit).sort({ _id: -1 }).populate('party');


  if (party && gst) {
    allData = allData.filter((d, i) => d.party.name === party && d.party.gst === gst);
  }
  else if (party) {
    allData = allData.filter((d, i) => d.party.name === party);
  }
  else if (gst) {
    allData = allData.filter((d, i) => d.party.gst === gst);
  }


  if (!allData) {
    return res.status(500).json({ 'err': 'No proforma availble', get: false });
  }

  return res.status(200).json({ data: allData, totalData: totalData });

}


const getMonthWisePaymentOut = async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(500).json({ 'err': 'Invalid user' });
  }

  try {
    const getInfo = await getId(token);
    const getUserData = await userModel.findOne({ _id: getInfo._id });

    const currentYear = new Date().getFullYear();

    const result = await paymentOutModel.aggregate([
      {
        $match: {
          isTrash: false,
          isDel: false,
          userId: new mongoose.Types.ObjectId(String(getInfo._id)),
          companyId: new mongoose.Types.ObjectId(getUserData.activeCompany),
          paymentOutDate: {
            $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
            $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`)
          }
        }
      },
      {
        $group: {
          _id: { month: { $month: "$paymentOutDate" } },
          totalAmount: { $sum: { $toDouble: "$amount" } }
        }
      },
      {
        // Convert grouped format -> { month, totalAmount }
        $project: {
          _id: 0,
          month: "$_id.month",
          totalAmount: 1
        }
      },
      {
        // Create array [1..12]
        $facet: {
          data: [{ $sort: { month: 1 } }],
          months: [
            {
              $project: {
                months: { $range: [1, 13] }  // 1 to 12
              }
            }
          ]
        }
      },
      {
        // Merge all months with actual data
        $project: {
          months: { $arrayElemAt: ["$months.months", 0] },
          data: 1
        }
      },
      {
        $project: {
          final: {
            $map: {
              input: "$months",
              as: "m",
              in: {
                month: "$$m",
                totalAmount: {
                  $let: {
                    vars: {
                      match: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$data",
                              as: "d",
                              cond: { $eq: ["$$d.month", "$$m"] }
                            }
                          },
                          0
                        ]
                      }
                    },
                    in: { $ifNull: ["$$match.totalAmount", 0] }
                  }
                }
              }
            }
          }
        }
      },
      {
        $unwind: "$final"
      },
      {
        $replaceRoot: { newRoot: "$final" }
      },
      { $sort: { month: 1 } }
    ]);

    return res.json(result);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



module.exports = {
  add,
  get,
  remove,
  restore,
  filter,
  getMonthWisePaymentOut
}
