import * as pulumi from "@pulumi/pulumi";
import { ReportViolation, } from "@pulumi/policy";
import * as fs from "fs";
import * as zlib from "zlib";
import * as path from "path";

const memoize = require("fast-memoize");

export const requireTags = function (tags: any, tagsToCheck: string[], reportViolation: ReportViolation) {
    for (let tagName of tagsToCheck) {
        if ((tags || {})[tagName] === undefined) {
            reportViolation(`Tag [${tagName}] must be defined.`);
        }
    }
};

export const isType = function (actual: string, expected: any): boolean {
    return actual === (<any>expected)["__pulumiType"];
}

/**
 * Cost-related helpers
 */
const getPricingData = function (): (any) {
    const localFilePath = "./resources/offers-ec2-us-east-1.json.gz";
    if (!fs.existsSync(localFilePath)) {
        console.log("Local pricing file is missing - run `make bootstrap` and try again. Exiting...");
        throw new Error();
    }
    const localPricingDataGz = fs.readFileSync(localFilePath);
    const localPricingData = zlib.gunzipSync(localPricingDataGz);
    return JSON.parse(localPricingData.toString());
}

const getMonthlyInstanceOnDemandPrice = function (instanceType: string): (number) {
    const pricingData: any = getPricingData();
    const pricingDataProducts: any = pricingData["products"];
    const pricingDataTermsOnDemand: any = pricingData["terms"]["OnDemand"];

    const arrValues = Array.from(Object.values(pricingDataProducts));
    const skus: any[] = arrValues.filter((it: any) =>
        it["attributes"]["instanceType"] === instanceType
        && it["attributes"]["operatingSystem"] === "Linux"  // TODO: use AMI to determine this
        && it["attributes"]["preInstalledSw"] === "NA"
        && it["attributes"]["usagetype"] === `BoxUsage:${instanceType}`
    );
    if (skus.length > 1) {
        console.log("Shouldn't find more than one sku. Continuing with first...");
    }
    const sku = skus[0]["sku"];

    const skuCode = `${sku}.JRTCKXETXF`; // JRTCKXETXF = On demand offer term code
    const skuPricing: any = pricingDataTermsOnDemand[sku][skuCode];

    const priceRateCode = `${skuCode}.6YS6EN2CT7`; // 6YS6EN2CT7 = Price per hour rate code
    const priceDimension: any = skuPricing["priceDimensions"][priceRateCode];

    const pricePerHour = Number(priceDimension["pricePerUnit"]["USD"]);
    const costPerMonth = pricePerHour * 24 * 30;

    return costPerMonth;
}

// speed things up - for 20 instances this reduces time from ~30s to ~10s
export const fastGetMonthlyInstanceOnDemandPrice = memoize(getMonthlyInstanceOnDemandPrice);

export const formatAmount = function (amount: string | number): (string) {
    if (amount == '') {
        return ''; // must return a string otherwise colunify through a "Cannot read property 'trim' of undefined"
    }
    if (typeof amount == 'string') {
        amount = parseInt(amount);
    }

    return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export const writeFile = function (filePath: string, fileData: string) {
    const absoluteFilePath = path.resolve(filePath);
    pulumi.log.info(`Writing file to [${absoluteFilePath}]`);
    fs.writeFileSync(absoluteFilePath, fileData);
    return;
};

export const getPulumiType = function (resource: any): (string) {
    return (<any>resource)["__pulumiType"];
}
