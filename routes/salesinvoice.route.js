const {
  add, get, remove,
  restore, filter, summaryReport,
  getTotalCollect, getInvoiceByPartId
} = require("../controllers/salesinvoice.controller");
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
  .route("/get-total-collect")
  .post(getTotalCollect);


router
  .route("/get-party-invoice")
  .post(getInvoiceByPartId);

module.exports = router;

