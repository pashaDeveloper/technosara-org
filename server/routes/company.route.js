const express = require("express");
const verify = require("../middleware/verifyAdmin.middleware");
const authorize = require("../middleware/authorize.middleware");
const arvanUpload = require("../middleware/arvanUpload.middleware");
const companyController = require("../controllers/company.controller");

const router = express.Router();
const companyUploadFields = [
  { name: "logo", maxCount: 1 },
];

router.get(
  "/countries",
  companyController.getCompanyCountries,
);
router.get(
  "/all",
  companyController.getCompanyOptions,
);
router.get(
  "/",
  companyController.getCompanies,
);
router.post(
  "/",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("company").fields(companyUploadFields),
  companyController.createCompany,
);
router.patch(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  arvanUpload("company").fields(companyUploadFields),
  companyController.updateCompany,
);
router.delete(
  "/:id",
  verify,
  authorize("superAdmin", "admin"),
  companyController.deleteCompany,
);
router.get(
  "/:id",
  companyController.getCompany,
);

module.exports = router;
