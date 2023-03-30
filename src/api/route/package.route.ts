import { Router } from 'express';
import { authorizeUser } from '../middleware/authorize_user';
import { logger } from '../../logging';
import { PackageData } from '../model/packageData';
import { PackageMetadata } from '../model/packageMetadata';
import { Request, Response } from 'express';
import { packages } from '../app';
import Joi from 'joi';
import { PackageHistoryEntry } from '../model/packageHistoryEntry';
import { PackageRating } from '../model/packageRating';
import { Package } from '../model/package';

const express = require('express');

const packageRouter: Router = express.Router();

// This ensures that Content, URL, and JSProgram are all inputted as strings
const schema = Joi.object({
    Content: Joi.string(),
    URL: Joi.string(),
    JSProgram: Joi.string(),
});

// Create a package when POST /package is called
packageRouter.post('/', authorizeUser, (req: Request, res: Response) =>  {
    logger.info("POST /package");

    let packageData: PackageData = {};
    try {
        packageData = req.body;
        logger.info("Package data: " + JSON.stringify(packageData));
    } catch {
        // Request body is not valid JSON
        logger.info("Invalid JSON for POST /package");
    }

    // Validate with joi (trivial example)
    const { error, value } = schema.validate(packageData);
    if (error) {
        // Request body is not valid
    }

    // Check the inputted data

    // Package already exists: status 409
    
    // Package not updated due to disqualified rating: status 423

    // Success: status 201

    // Get metadata from package (from APIS?)
    let metadata: PackageMetadata = {
        Name: "test",
        Version: "1.0.0",
        ID: "1234",
    }
    
    // Store this package in database
    // for now, just store it in memory
    packages.push(packageData);

    logger.info("POST /package: Package created successfully");
    res.status(201).send({
        "metadata": metadata,
        "data": {
            "Content": packageData.Content,
            "JSProgram": packageData.JSProgram,
        }
    });
});

// Return a package when GET /package/byName/{name} is called
packageRouter.get('/byName/:name', authorizeUser, (req: Request, res: Response) =>  {
    logger.info("GET /package/byName/{name}");

    let name: string;
    let packageHistoryEntry: PackageHistoryEntry;
    try {
        name = req.params.name;
        logger.info("package name :" + name);

        // TODO: Hit database to get package version information
        packageHistoryEntry = {
            User: {
                name: name,
                isAdmin: true,
            },
            Date: "2021-04-01",
            PackageMetadata: {
                Name: "test package metadata",
                Version: "1.0.0",
                ID: "1234",
            },
            Action: PackageHistoryEntry.ActionEnum.Create,
        }

        res.status(200).send([packageHistoryEntry, packageHistoryEntry]);
    } catch {
        // Request body is not valid JSON
        logger.info("Invalid JSON for GET /package/byName/{name}");
    }

    // Validate with joi (trivial example)
});

// Return a package when DELETE /package/byName/{name} is called
packageRouter.delete('/byName/:name', authorizeUser, (req: Request, res: Response) =>  {
    logger.info("DELETE /package/byName/{name}");

    let name: string;
    let auth: string;
    try {
        name = req.params.name;
        auth = req.header('X-Authorization') || "";
        // Require auth

        logger.info("Auth data: " + auth);

        // TODO: Get the package from the database using the name
        // TODO: Delete package

        // If status is 200, ok. Send 404 if package doesn't exist. 
        res.status(200).send("Package is deleted.");

        res.status(404).send("Package does not exist.");
    } catch {
        // Request body is not valid JSON
        logger.info("Invalid JSON for DELETE /package/:id");
    }
});

// Rate a package when GET /package/:id/rate is called
packageRouter.get('/:id/rate', authorizeUser, (req: Request, res: Response) =>  {
    logger.info("GET /package/:id/rate");

    let id: number;
    let packageRate: PackageRating;
    try {
        id = parseInt(req.params.id);

        // TODO: Get the package from the database using the id

        // Fill in PackageRating 
        // TODO: Hit rate module to get this info
        packageRate = {
            BusFactor: 1,
            Correctness: 0.5,
            RampUp: 0.8,
            ResponsiveMaintainer: 0.3,
            LicenseScore: 0.1,
            /**
             * The fraction of its dependencies that are pinned to at least a specific major+minor version, e.g. version 2.3.X of a package. (If there are zero dependencies, they should receive a 1.0 rating. If there are two dependencies, one pinned to this degree, then they should receive a Â½ = 0.5 rating).
             */
            GoodPinningPractice: 1,
            /**
             * The fraction of project code that was introduced through pull requests with a code review).
            */
            GoodEngineeringProcess: 1,
        
            NetScore: 1,
        }

        // TODO: Update the database to have this rating for the given package

        // If status is 200, ok. Send 404 if package doesn't exist. 
        // Send 500 if rating module failed
        res.status(200).send(packageRate);
    } catch {
        // Request body is not valid JSON
        logger.info("Invalid JSON for GET /package/:id/rate");
    }

    // Validate with joi (trivial example)
});

// Get a package when GET /package/:id is called
packageRouter.get('/:id', authorizeUser, (req: Request, res: Response) =>  {
    logger.info("GET /package/:id");

    let id: number;
    let auth: string;
    let packageInfo: Package;
    try {
        id = parseInt(req.params.id);
        auth = req.header('X-Authorization') || "";
        // Require auth

        logger.info("Auth data: " + auth);

        // TODO: Get the package from the database using the id

        // Fill in PackageRating 
        // TODO: Hit database to get this info
        packageInfo = {
            metadata: {
                Name: "test",
                Version: "1.0.0",
                ID: "1234",
            },
            data: {
                Content: "test content",
                URL: "test url",
                JSProgram: "test js program",
            }
        }

        // If status is 200, ok. Send 404 if package doesn't exist. 
        res.status(200).send(packageInfo);

        res.status(404).send("Package does not exist.");
    
        // "There is missing field(s) in the PackageID/AuthenticationToken
        // or it is formed improperly, or the AuthenticationToken is invalid."
        res.status(400).send("unexpected error");
    } catch {
        // Request body is not valid JSON
        logger.info("Invalid JSON for GET /package/:id");
    }
});

// Update a package when PUT /package/:id is called
packageRouter.put('/:id', authorizeUser, (req: Request, res: Response) =>  {
    logger.info("PUT /package/:id");

    let id: number;
    let auth: string;
    let packageInfo: Package;
    try {
        id = parseInt(req.params.id);
        auth = req.header('X-Authorization') || "";
        // Require auth

        logger.info("Auth data: " + auth);

        packageInfo = req.body; // Get user-inputted package details
        // Validate with joi

        // TODO: Get the package from the database using the id
        // TODO: Update contents with new contents

        packageInfo.data.Content = "new content yaya";

        // If status is 200, ok. Send 404 if package doesn't exist. 
        res.status(200).send(packageInfo);

        res.status(404).send("Package does not exist.");
    } catch {
        // Request body is not valid JSON
        logger.info("Invalid JSON for PUT /package/:id");
    }
});

// Delete a package when DELETE /package/:id is called
packageRouter.delete('/:id', authorizeUser, (req: Request, res: Response) =>  {
    logger.info("DELETE /package/:id");

    let id: number;
    let auth: string;
    try {
        id = parseInt(req.params.id);
        auth = req.header('X-Authorization') || "";
        // Require auth

        logger.info("Auth data: " + auth);

        // TODO: Get the package from the database using the id
        // TODO: Delete package

        // If status is 200, ok. Send 404 if package doesn't exist. 
        res.status(200).send("Package is deleted.");

        res.status(404).send("Package does not exist.");
    } catch {
        // Request body is not valid JSON
        logger.info("Invalid JSON for PUT /package/:id");
    }
});

packageRouter.post('/byRegEx/:regex', authorizeUser, (req: Request, res: Response) =>  {
    logger.info("POST /package/byRegEx/{regex}");

    let regex: string;
    let regex_body: string;
    let auth: string;
    let packageMetadata: PackageMetadata;
    let return_data: Object;
    try {
        regex = req.params.regex;
        logger.info("Got regex: " + regex);

        auth = req.header('X-Authorization') || "";
        // Require auth

        logger.info("Auth data: " + auth);

        regex_body = req.body.PackageRegEx;

        logger.info("Got regex body: " + regex_body);

        // TODO: Get the package from the database using the regex
        // TODO: Return package

        // TODO: Hit database for this metadata
        packageMetadata = {
            Name: "test",
            Version: "1.0.0",
            ID: "1234",
        };

        logger.info("Preparing return_data");

        // According to YML spec, return only name and version
        return_data = {
            Name: packageMetadata.Name,
            Version: packageMetadata.Version,
        };

        logger.info("Sending status");

        // If status is 200, ok. Send 404 if package doesn't exist. 
        res.status(200).send([return_data, return_data]);

        //res.status(404).send("No package found under this regex.");
    } catch {
        // Request body is not valid JSON
        logger.info("Invalid JSON for POST /RegEx/{regex}");
    }
});

module.exports = packageRouter;