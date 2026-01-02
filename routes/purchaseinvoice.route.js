const {
  add, get,
  remove, restore,
  filter, summaryReport,
  getInvoiceByItemId,
  getTotalPay,
  getInvoiceByPartId
} = require("../controllers/purchaseinvoice.controller");
const router = require("express").Router();


router
  .route("/add")
  .post(add);


router
  .route("/get")
  .post(get);

  
router
  .route("/delete")
  .delete(remove)


router
  .route("/restore")
  .post(restore)


router
  .route("/filter")
  .post(filter);


router
  .route("/summary-reports")
  .post(summaryReport);


router
  .route("/get-item-invoice")
  .post(getInvoiceByItemId);


router
  .route("/get-total-pay")
  .post(getTotalPay);


router
  .route("/get-party-invoice")
  .post(getInvoiceByPartId);
  

 
module.exports = router;

