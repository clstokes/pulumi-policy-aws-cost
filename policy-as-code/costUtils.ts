import * as policy from "@pulumi/policy";
import * as aws from "@pulumi/aws";

import { isType, getPulumiType, } from "./utils";

import * as fs from "fs";
import * as zlib from "zlib";

const memoize = require("fast-memoize");

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
const fastGetMonthlyInstanceOnDemandPrice = memoize(getMonthlyInstanceOnDemandPrice);

interface CostItems {
    resource: string,
    type?: string,
    qty?: number,
    unitCost?: number,
    monthlyTotal: number,
    isFinalTotal?: boolean,
}

export const calculateEstimatedCosts = function (resources: policy.PolicyResource[]) {

    const costItems: CostItems[] = [];

    // Find _all_ instances
    const instanceCostData = calculateInstanceCosts(resources);
    costItems.push(...instanceCostData);

    // Find _all_ Auto Scaling Groups
    const asgCostData = calculateAsgCosts(resources);
    costItems.push(...asgCostData);

    // Sum each monthlyTotal to get TOTAL monthly cost.
    let totalCost = 0;
    costItems.forEach((v) => {
        totalCost += v.monthlyTotal;
    })
    costItems.push({ resource: "TOTAL", monthlyTotal: totalCost, isFinalTotal: true });

    return costItems;
}

const calculateInstanceCosts = function (resources: policy.PolicyResource[]) {
    // Find _all_ instances
    const instances = resources.filter(it => isType(it.type, aws.ec2.Instance));

    // Aggregate instance type counts
    const resourceCounts = new Map<string, number>();
    instances.forEach(it => {
        if (resourceCounts.get(it.props.instanceType) === undefined) {
            // initiate a preliminary cost of '0.0`
            resourceCounts.set(it.props.instanceType, 0);
        }
        const resourceCount = resourceCounts.get(it.props.instanceType)! + 1;
        resourceCounts.set(it.props.instanceType, resourceCount)
    });

    // Aggregate costs
    const costItems: CostItems[] = [];
    resourceCounts.forEach((v, k) => {
        const price = fastGetMonthlyInstanceOnDemandPrice(k);
        const totalMonthylResourceCost = v * price;
        costItems.push({ resource: getPulumiType(aws.ec2.Instance), type: k, qty: v, unitCost: price, monthlyTotal: totalMonthylResourceCost });
    });

    return costItems;
}

const calculateAsgCosts = function (resources: policy.PolicyResource[]) {

    // Find _all_ autoscaling groups
    const asgs = resources.filter(it => isType(it.type, aws.autoscaling.Group));

    // Aggregate instance type counts
    const resourceCounts = new Map<string, number>();
    asgs.forEach(it => {
        let instanceType = undefined;
        if (it.props.launchConfiguration !== undefined) {
            const launchConfiguration = resources.find(res => isType(res.type, aws.ec2.LaunchConfiguration) && res.props.name === it.props.launchConfiguration);
            instanceType = launchConfiguration?.props.instanceType;

        } else if (it.props.launchTemplate !== undefined) {
            const launchTemplate = resources.find(res => isType(res.type, aws.ec2.LaunchTemplate) && res.props.name === it.props.launchTemplate.name);
            instanceType = launchTemplate?.props.instanceType;
        }

        if (resourceCounts.get(instanceType) === undefined) {
            // initiate a preliminary cost of '0.0`
            resourceCounts.set(instanceType, 0);
        }

        const resourceCount = resourceCounts.get(instanceType)! + it.props.minSize;
        resourceCounts.set(instanceType, resourceCount);
    });

    // Aggregate costs
    const costItems: CostItems[] = [];
    resourceCounts.forEach((v, k) => {
        const price = fastGetMonthlyInstanceOnDemandPrice(k);
        const totalMonthylResourceCost = v * price;
        costItems.push({ resource: getPulumiType(aws.autoscaling.Group), type: k, qty: v, unitCost: price, monthlyTotal: totalMonthylResourceCost });
    });

    return costItems;

}

export const formatAmount = function (amount: string | number): (string) {
    if (typeof amount == 'string') {
        amount = parseFloat(amount);
    }

    if (isNaN(amount)) {
        return ''; // must return a string otherwise colunify through a "Cannot read property 'trim' of undefined"
    }

    return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // 20.12345678 -> $20.12
}
