const { getId } = require("../helper/getIdFromToken");
const itemModel = require("../models/item.model");
const userModel = require("../models/user.model");
const purchaseInvoiceModel = require("../models/purchaseInvoice.model");
const salesinvoiceModel = require("../models/salesinvoice.model");
const salesReturnModel = require("../models/salesReturn.model");
const purchaseReturModel = require("../models/purchasereturn.model");
const bwipjs = require('bwip-js');
const fs = require('fs');
const path = require('path');
const { default: mongoose } = require("mongoose");


// Add controller;
const add = async (req, res) => {
  const { token, title, type, salePrice, category, details, update, id, unit, stock, hsn,
    purchasePrice, purchaseTaxType, saleTaxType, itemCode, tax
  } = req.body;

  if ([token, title, salePrice,].some(field => !field || field === "")) {
    return res.json({ err: 'require fields are empty', create: false });
  }

  if (!unit.length || unit.some(u => !u.unit || !u.conversion)) {
    return res.status(500).json({ err: 'Unit is required', create: false });
  }


  try {
    const getInfo = await getId(token);
    const getUserData = await userModel.findOne({ _id: getInfo._id });

    const isExist = await itemModel.findOne({ title, companyId: getUserData.activeCompany, isDel: false });
    if (isExist && !update) {
      return res.status(500).json({ err: 'Item alredy exist', create: false })
    }

    // update code.....
    if (update && id) {
      const update = await itemModel.updateOne({ _id: id }, {
        $set: {
          title, type, salePrice, category: category || null, details, unit, hsn,
          purchasePrice, purchaseTaxType, saleTaxType, itemCode, tax
        }
      })

      if (!update) {
        return res.status(500).json({ err: 'Item update failed', update: false })
      }

      return res.status(200).json(update)

    } // Update close here;


    let openingStock = [];
    let stockAlert = [];
    if (!update) {
      unit.forEach(u => {
        openingStock.push({
          unit: u.unit,
          stock: u.opening
        })

        stockAlert.push({
          unit: u.unit,
          alert: u.alert
        })
      })
    }


    // ===========[Generate Barcode]=========;
    if (itemCode) {
      const barcodePath = path.join(__dirname, '..', 'barcodes', `${itemCode}.png`);
      bwipjs.toBuffer({
        bcid: 'code128',
        text: itemCode,
        scale: 1,
        height: 5,
        // includetext: true,
        // textxalign: 'center',
        // textgapsp: 5,
      }, (err, png) => {
        if (err) {
          console.error(err);
        } else {
          fs.writeFileSync(barcodePath, png);
          console.log('Barcode created!');
        }
      });
    }


    const insert = await itemModel.create({
      userId: getUserData._id, companyId: getUserData.activeCompany, hsn,
      purchasePrice, purchaseTaxType, saleTaxType, itemCode,
      title, type, salePrice, category: category || null, details, unit,
      stock: openingStock, alert: stockAlert, tax,
      barcodeImage: `/barcodes/${itemCode}.png`
    });

    if (!insert) {
      return res.status(500).json({ err: 'Item creation failed', create: false })
    }


    return res.status(200).json(insert);

  } catch (error) {
    console.log(error)
    return res.status(500).json({ 'err': 'Something went wrong', create: false });
  }
}


// get Controller
const get = async (req, res) => {
  const { token, trash, id, all, search, searchText, barCode } = req.body;
  const { page, limit } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);


  if (!token) {
    return res.status(500).json({ 'err': 'Invalid user', get: false });
  }

  try {
    const getInfo = await getId(token);
    const getUser = await userModel.findOne({ _id: getInfo._id });
    const totalData = await itemModel.countDocuments({
      companyId: getUser.activeCompany,
      isTrash: trash ? true : false,
      isDel: false
    });

    let getData;
    if (id) {
      getData = await itemModel.findOne({
        companyId: getUser.activeCompany,
        _id: id,
        isTrash: false,
        isDel: false
      }).populate('category');
    }
    else if (barCode) {
      getData = await itemModel.findOne({
        companyId: getUser.activeCompany,
        itemCode: barCode,
        isTrash: false,
        isDel: false
      }).populate('category');
    }
    else if (trash) {
      getData = await itemModel.find({
        companyId: getUser.activeCompany,
        isTrash: trash ? true : false,
        isDel: false
      }).skip(skip).limit(limit).populate('category').sort({ _id: -1 });
    }
    else if (all) {
      getData = await itemModel.find({
        companyId: getUser.activeCompany,
        isDel: false
      }).skip(skip).limit(limit).populate('category').sort({ _id: -1 });
    }
    else if (search) {
      if (searchText.trim() !== "") {
        getData = await itemModel.find({
          title: { $regex: searchText.trim(), $options: "i" },
          companyId: getUser.activeCompany,
          isDel: false,
          isTrash: false
        }).sort({ _id: -1 }).select("_id title");
      }
    }
    else {
      getData = await itemModel.find({
        companyId: getUser.activeCompany,
        isTrash: false,
        isDel: false
      }).skip(skip).limit(limit).populate('category').sort({ _id: -1 });
    }

    if (!getData) {
      return res.status(500).json({ 'err': 'No item available', get: false });
    }

    // ========================= [Get stock] =========================
    
    const results = []; // array of { itemId, title, stockObj, totalSmallest }

    if (getData.length > 0) {
      for (const item of getData) {

        // ---------------------------------------
        // 1) Build conversion map (unit -> conversion)
        // ---------------------------------------
        const unitMap = {};
        item?.unit?.forEach(u => {
          unitMap[u.unit] = Number(u.conversion);
        });

        // Defensive: No units
        const conversions = Object.values(unitMap);
        if (conversions.length === 0) {
          results.push({ itemId: item._id, title: item.title, stock: {} });
          continue;
        }

        // Smallest = highest conversion numeric
        const maxConv = Math.max(...conversions);

        // Convert each unit to smallest-unit multiplier
        const unitSizeInSmallest = {};
        for (const [u, conv] of Object.entries(unitMap)) {
          unitSizeInSmallest[u] = maxConv / conv;
        }

        // ------------------------------------------------------
        //                     PURCHASE TOTAL
        // ------------------------------------------------------
        let purchaseSmallest = 0;
        const purchaseInv = await purchaseInvoiceModel.find({
          "items.itemId": item._id.toString(),
          isDel: false
        });

        purchaseInv.forEach(inv => {
          (inv.items || []).forEach(pItem => {
            if (String(pItem.itemId) !== String(item._id)) return;

            const qty = Number(pItem.qun) || 0;
            const usedUnit = pItem.selectedUnit;
            const size = unitSizeInSmallest[usedUnit];
            if (!size) return;

            purchaseSmallest += qty * size;
          });
        });

        // ------------------------------------------------------
        //                PURCHASE RETURN (SUBTRACT)
        // ------------------------------------------------------
        let purchaseReturnSmallest = 0;
        const purchaseReturnInv = await purchaseReturModel.find({
          "items.itemId": item._id.toString(),
          isDel: false
        });

        purchaseReturnInv.forEach(inv => {
          (inv.items || []).forEach(pItem => {
            if (String(pItem.itemId) !== String(item._id)) return;

            const qty = Number(pItem.qun) || 0;
            const usedUnit = pItem.selectedUnit;
            const size = unitSizeInSmallest[usedUnit];
            if (!size) return;

            purchaseReturnSmallest += qty * size; // FIXED
          });
        });

        // ------------------------------------------------------
        //                  SALES TOTAL (SUBTRACT)
        // ------------------------------------------------------
        let salesSmallest = 0;
        const salesInv = await salesinvoiceModel.find({
          "items.itemId": item._id.toString(),
          isDel: false
        });

        salesInv.forEach(inv => {
          (inv.items || []).forEach(sItem => {
            if (String(sItem.itemId) !== String(item._id)) return;

            const qty = Number(sItem.qun) || 0;
            const usedUnit = sItem.selectedUnit;
            const size = unitSizeInSmallest[usedUnit];
            if (!size) return;

            salesSmallest += qty * size;
          });
        });

        // ------------------------------------------------------
        //                  SALES RETURN  (ADD)
        // ------------------------------------------------------
        let salesReturnSmallest = 0;
        const salesReturnInv = await salesReturnModel.find({
          "items.itemId": item._id.toString(),
          isDel: false
        });

        salesReturnInv.forEach(inv => {
          (inv.items || []).forEach(sItem => {
            if (String(sItem.itemId) !== String(item._id)) return;

            const qty = Number(sItem.qun) || 0;
            const usedUnit = sItem.selectedUnit;
            const size = unitSizeInSmallest[usedUnit];
            if (!size) return;

            salesReturnSmallest += qty * size; // FIXED
          });
        });

        // ------------------------------------------------------
        //                     FINAL STOCK
        // ------------------------------------------------------
        const totalSmallestUnits =
          purchaseSmallest
          - salesSmallest
          - purchaseReturnSmallest
          + salesReturnSmallest;

        // ------------------------------------------------------
        //              Convert smallest → units
        // ------------------------------------------------------
        const sortedUnits = Object.keys(unitSizeInSmallest)
          .sort((a, b) => unitSizeInSmallest[b] - unitSizeInSmallest[a]);

        let remaining = totalSmallestUnits;
        const stockObj = {};

        for (const u of sortedUnits) {
          const size = unitSizeInSmallest[u];
          const qty = Math.floor(remaining / size);
          stockObj[u] = qty;
          remaining -= qty * size;
        }

        // ------------------------------------------------------
        //                    PUSH FINAL RESULT
        // ------------------------------------------------------
        results.push({
          itemId: item._id,
          title: item.title,
          totalSmallestUnits,
          stock: stockObj
        });

      } // end for loop
    }

    // console.log(results);

    return res.status(200).json({ data: getData, totalData: totalData, stock: results });

  } catch (error) {
    console.log(error)
    return res.status(500).json({ 'err': 'Something went wrong', get: false });
  }

}



// Delete controller;
const remove = async (req, res) => {
  const { ids, trash } = req.body;


  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ err: "No valid ids provided", remove: false });
  }

  try {
    let updateQuery;
    if (trash) {
      updateQuery = { $set: { isTrash: true } };
    } else {
      updateQuery = { $set: { isDel: true } };
    }

    const removeData = await itemModel.updateMany(
      { _id: { $in: ids } },
      updateQuery
    );

    if (removeData.matchedCount === 0) {
      return res.status(404).json({ err: "No matching item found", remove: false });
    }

    return res.status(200).json({
      msg: trash
        ? "Item successfully trash"
        : "Item successfully delete",
      modifiedCount: removeData.modifiedCount,
    });

  } catch (error) {
    console.log(error)
    return res.status(500).json({ err: "Something went wrong", remove: false });
  }
};


// Resoter from trash;
const restore = async (req, res) => {
  const { ids } = req.body;

  if (ids.length === 0) {
    return res.status(500).json({ err: 'require fields are empty', restore: false });
  }

  try {
    const restoreData = await itemModel.updateMany({ _id: { $in: ids } }, {
      $set: {
        isTrash: false
      }
    })

    if (restoreData.matchedCount === 0) {
      return res.status(404).json({ err: "No Item restore", restore: false });
    }

    return res.status(200).json({ msg: 'Restore successfully', restore: true })

  } catch (error) {
    return res.status(500).json({ err: "Something went wrong", restore: false });
  }

}


/**
 * Get Purchase Bill by Item Id;
 * Used Modules: [Item Details, ]
 */
const getPurchaseInvoice = async (req, res) => {
  const { token, itemId } = req.body;

  if (!token || !itemId) {
    return res.status(401).json({ err: 'require token and item id' });
  }

  try {
    const getInfo = await getId(token);
    if (!getInfo) return res.status(401).json({ err: 'invalid token' });
    const getUser = await userModel.findOne({ _id: getInfo._id });


    const invoice = await purchaseInvoiceModel.find({
      userId: new mongoose.Types.ObjectId(String(getInfo._id)),
      companyId: new mongoose.Types.ObjectId(getUser.activeCompany),
      "items.itemId": itemId
    })

    if (invoice.length < 1) {
      return res.status(404).json({ err: "No invoice found" });
    }

    return res.status(200).json(invoice);


  } catch (error) {
    console.log(error);
    return res.status(500).json({ err: "Something went wrong" });
  }
}


module.exports = {
  add,
  get,
  remove,
  restore,
  getPurchaseInvoice
};
