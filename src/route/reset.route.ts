import { Router } from 'express';
import { authorizeUser } from '../middleware/authorize_user';
import { logger } from '../logging';
import { Request, Response } from 'express';
import { Package } from "../model/package";
import { PackageMetadata } from "../model/packageMetadata";
import { PackageData } from "../model/packageData";
import { PackageModel } from '../model/package';
import { ProfileModel } from "../model/user";
const express = require("express");

export const resetRouter: Router = express.Router();

// Create a package when DELETE /reset is schema
resetRouter.delete("/", authorizeUser, async (req: Request, res: Response) => {
  logger.info("DELETE /reset");

  try {
    logger.info("Request body: " + req.headers);
    // TODO: check authorization

    // TODO: reset registry
    const defaultuser = new ProfileModel({
      User: {
        name: "ece461defaultadminuser",
        isAdmin: true,
        isUpload: true,
        isDownload: true,
        isSearch: true,
      },
      Secret: {
        password:
          "correcthorsebatterystaple123(!__+@**(A’”`;DROP TABLE packages;",
      },
    });
    //await defaultuser.save();
    if (res.locals.isAdmin) {
      await PackageModel.deleteMany({});
      await ProfileModel.deleteMany({});
      await defaultuser.save();
      res.status(200).send("Registry is reset");
      return;
    }
    res.status(401).send("You do not have permission to reset the registry.");
  } catch (error) {
    // Request body is not valid JSON
    logger.info("Invalid JSON for DELETE /reset");
  }

  // Validate with joi (trivial example)
});

// module.exports = resetRouter;