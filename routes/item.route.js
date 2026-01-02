const { add, get, remove, restore, getPurchaseInvoice } = require("../controllers/item.controller");
const router = require("express").Router();

router
  .route("/add")
  .post(add);

router
  .route("/get")
  .post(get);

router
  .route("/delete")
  .delete(remove);

router
  .route('/restore')
  .post(restore);

router
  .route("/get-purchase-invoice")
  .post(getPurchaseInvoice);


module.exports = router;
