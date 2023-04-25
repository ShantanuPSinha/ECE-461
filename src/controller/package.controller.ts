import { logger } from "../logging";
import { PackageMetadata } from "../model/packageMetadata";
import { Request, Response, NextFunction } from "express";
import { PackageHistoryEntry } from "../model/packageHistoryEntry";
import { PackageHistoryEntryModel } from "../model/packageHistoryEntry";
import { getContentFromUrl } from "../service/zip";
import { getGitRepoDetails, npm_2_git } from "../service/misc";
import { PackageRating, PackageRatingModel } from "../model/packageRating";
import { PackageModel } from "../model/package";
import { getPackageJSON } from "../service/zip";
import { ratePackage } from "../service/rate";
import { uploadFileToMongo } from "../config/config";
import path from "path";
import fs from "fs";
import axios from "axios";

export const postPackage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.info("postPackage: POST /package endpoint hit");

  let packageToUpload;
  let rating: PackageRating;
  let package_json: Object = {};
  let historyEntry;
  let github_url: string;
  let temp: string;

  // You must set the metadata before trying to save this
  packageToUpload = new PackageModel({
    data: req?.body,
  });

  // Package already exists: status 409
  const query = PackageModel.find();
  query.or([
    { "data.Content": { $exists: true, $eq: packageToUpload.data.Content } },
    { "data.URL": { $exists: true, $eq: packageToUpload.data.URL } },
  ]);
  const package_query_results = await query.findOne();
  if (package_query_results) {
    logger.info(
      "POST /package: Package already exists, got package: " +
        package_query_results
    );
    return res.status(409).send("Package exists already.");
  }

  // Try to fetch the URL from the package_json
  if (packageToUpload.data.Content) {
    package_json = await getPackageJSON(packageToUpload.data.Content);
    try {
      packageToUpload.data.URL = package_json["homepage"];
      if (!packageToUpload.data.URL) {
        logger.debug("POST /package: Package not uploaded, no homepage field");
        return res.status(400).send("Invalid Content (could not find url)");
      }
    } catch (error) {
      logger.debug(
        "POST /package: Package not uploaded, no homepage field or no package.json"
      );
      return res.status(400).send("Invalid Content");
    }
  }

  github_url = packageToUpload.data.URL.startsWith(
    "https://www.npmjs.com/package/"
  )
    ? await npm_2_git(packageToUpload.data.URL)
    : packageToUpload.data.URL;

  packageToUpload.metadata = await getMetadata(github_url, package_json);
  if (!packageToUpload.metadata) {
    logger.info("POST /package: Package not uploaded, invalid metadata");
    return res.status(400).send("Invalid Content or URL");
  }

  if (packageToUpload.metadata.Name == "*") {
    logger.info("POST /package: Package not uploaded, invalid name");
    return res.status(400).send("Invalid Content or URL");
  }

  if (await isNameInDb(packageToUpload.metadata.Name)) {
    return res.status(409).send("Package exists already.");
  }

  // Package not updated due to disqualified rating: status 423
  rating = ratePackage(packageToUpload.data.URL);

  // For now, nothing passes this, so I'm commenting it out
  // if (!verifyRating(rating)) {
  //   logger.info("POST /package: Package not uploaded, disqualified rating");
  //   res
  //     .status(424)
  //     .send("Package is not uploaded due to the disqualified rating.");
  //   return;
  // }

  let filePath: string = path.join(
    __dirname,
    "..",
    "artifacts",
    `${packageToUpload.metadata.Name}.txt`
  );
  let fileName: string = `${packageToUpload.metadata.Name}.txt`;

  if (!packageToUpload.data.Content) {
    // Use URL to get the Content
    packageToUpload.data.Content = await getContentFromUrl(github_url);
    if (!packageToUpload.data.Content) {
      logger.info("POST /package: Package not uploaded, invalid content");
      return res.status(400).send("Invalid Content or URL");
    }
  } else {
    fs.writeFileSync(filePath, packageToUpload.data.Content);
  }

  // Save package
  logger.info("POST /package: Saving package: " + packageToUpload);
  packageToUpload.metadata.ID = packageToUpload._id.toString();

  uploadFileToMongo(filePath, fileName, packageToUpload._id);

  // Utter stupidity so that I don't have to research how to not upload the current Content
  temp = packageToUpload.data.Content;
  packageToUpload.data.Content = fileName;

  await packageToUpload.save();
  logger.info(
    "POST /package: Package metadata added successfully " +
      packageToUpload.metadata
  );

  packageToUpload.data.Content = temp;

  // Save history entry
  historyEntry = buildHistoryEntry(packageToUpload.metadata, "CREATE");
  await historyEntry.save();
  logger.info("POST /package: History entry saved successfully");

  // Save rating
  let rateEntry = new PackageRatingModel(rating);
  rateEntry._id = packageToUpload._id;
  await rateEntry.save();

  logger.info("POST /package: Package created successfully");

  return res.status(201).send(packageToUpload.toObject());
};

async function getVersionFromURL(url: string, name: string): Promise<string> {
  // API call to get the version of a package from its url and name
  // :param url: string url
  // :param name: string name of package

  // TODO: Could someone who worked closely with the APIs in Part 1 do this part :)
  let apiUrl = "";
  // chekcing if url is gh or npm
  if (url.startsWith("https://www.npmjs.com/package/")) {
    const packageName = url.split("/").pop();
    try {
      const npmResponse = await axios.get(
        `https://registry.npmjs.org/${packageName}`
      );
      const repositoryUrl = npmResponse.data.repository.url;

      // maybe check here that the url is *actually* a gh url?
      apiUrl = `https://api.github.com/repos/${repositoryUrl.split("/")[3]}/${
        repositoryUrl.split("/")[4]
      }/releases`;
    } catch (error) {
      logger.debug("Error fetching GitHub URL from npm URL:", error);
      return "1.0.0"; // default
    }
  } else if (url.startsWith("https://github.com/")) {
    apiUrl = `https://api.github.com/repos/${url.split("/")[3]}/${
      url.split("/")[4]
    }/releases`;
  } else {
    logger.info("Invalid URL provided");
    return "1.0.0"; // default
  }

  try {
    const response = await axios.get(apiUrl);
    const releases = response.data;

    if (releases.length > 0) {
      const latestRelease = releases[0];
      return latestRelease.tag_name;
    } else {
      return "1.0.0"; // default
    }
  } catch (error) {
    logger.info("Unable to get version from URL: ", error);
    return "1.0.0"; // default
  }
}

function buildHistoryEntry(
  metadata: PackageMetadata,
  action: "CREATE" | "UPDATE" | "DOWNLOAD" | "RATE"
): PackageHistoryEntry {
  // Function description
  // :param metadata: PackageMetadata
  // :param action: string
  // :return: PackageHistoryEntry

  let historyEntry: PackageHistoryEntry = new PackageHistoryEntryModel({});
  historyEntry.Date = new Date().toISOString();
  historyEntry.PackageMetadata = metadata;
  historyEntry.Action = action;

  // Assign user that performed action
  // TODO: Koltan :) how do we know the user that uploaded this?
  // historyEntry.User = {
  //   name: "test",
  //   isAdmin: true,
  // }
  // historyEntry.User = {
  //   name: "test",
  //   isAdmin: true,
  //   isUpload: true,
  //   isSearch: true,
  //   isDownload: true,
  // };

  return historyEntry;
}

async function getMetadata(
  url: string,
  package_json: Object
): Promise<PackageMetadata | undefined> {
  // Function description
  // :param packageData: PackageData
  // :return: PackageMetadata

  let metadata: PackageMetadata = { Name: "", Version: "", ID: "" };

  // Add metadata to package
  // TODO: If Name is "*" we throw error because that's reserved?
  if (package_json && package_json["name"] && package_json["version"]) {
    metadata.Name = package_json["name"];
    metadata.Version = package_json["version"];
  } else {
    metadata.Name = (await getGitRepoDetails(url || ""))?.repoName || "";
    metadata.Version = await getVersionFromURL(url || "", metadata.Name);
  }

  if (!metadata.Name || !metadata.Version) {
    // We choked on the package trying to get its name and version
    logger.info("Unable to get metadata from package");
    return undefined;
  }

  logger.info("Successfully got metadata from package: " + metadata);
  return metadata;
}

async function isNameInDb(name: string): Promise<Number | null> {
  // Search database for the name, return 1 if it is in the db, 0 otherwise
  // :param name: string name of package
  // :return: Number

  logger.info("Checking if package name is in database");

  return (await PackageModel.findOne({ "metadata.Name": name })) ? 1 : 0;
}

// Export all non-exported functions just for testing
export const exportedForTestingPackageController = {
  getVersionFromURL,
  buildHistoryEntry,
  getMetadata,
};
