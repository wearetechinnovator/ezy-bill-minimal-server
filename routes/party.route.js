const { add, get, remove, restore, getLog } = require("../controllers/party.controller");
const { get: ladgerGet } = require("../controllers/ladger.controller")
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
  .route("/restore")
  .post(restore);

router
  .route("/log")
  .post(getLog)

router
  .route("/ladger")
  .post(ladgerGet);


module.exports = router;
