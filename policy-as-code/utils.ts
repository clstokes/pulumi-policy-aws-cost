import { ReportViolation, } from "@pulumi/policy";
import * as fs from "fs";
import * as zlib from "zlib";

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
export const getPricingData = function (): (any) {
    const localFilePath = "./resources/offers-ec2-us-east-1.json.gz";
    if (!fs.existsSync(localFilePath)) {
        console.log("Local pricing file is missing - run `make bootstrap` and try again. Exiting...");
        throw new Error();
    }
    const localPricingDataGz = fs.readFileSync(localFilePath);
    const localPricingData = zlib.gunzipSync(localPricingDataGz);
    return JSON.parse(localPricingData.toString());
}

export const getMonthlyOnDemandPrice = function (instanceType: string): (number) {
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
    // console.log(`Monthly cost of [${instanceType}] is [$${costPerMonth}].`); // TODO: Remove
    return costPerMonth;
}

export const formatAmount = function (amount: number): (string) {
    return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
