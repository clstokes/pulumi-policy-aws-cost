import * as policy from "@pulumi/policy";
import * as aws from "@pulumi/aws";

import { isType, getPulumiType, getMonthlyCost, CostItems, } from "./utils";

import * as fs from "fs";
import * as zlib from "zlib";

const memoize = require("fast-memoize");

/**
 * Cost-related helpers
 */
const getPricingData = function (): any {
    const localFilePath = "./resources/aws/offers-ec2-us-east-1.json.gz";
    if (!fs.existsSync(localFilePath)) {
        throw new Error(`Unable to load local pricing file [${localFilePath}]`);
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
    const hourlyPrice = getHourlyOnDemandPrice(pricingDataTermsOnDemand, sku);
    return getMonthlyCost(hourlyPrice);
}

const getMonthlyNatGatewayOnDemandPrice = function (): (number) {
    const pricingData: any = getPricingData();
    const pricingDataProducts: any = pricingData["products"];
    const pricingDataTermsOnDemand: any = pricingData["terms"]["OnDemand"];

    const arrValues = Array.from(Object.values(pricingDataProducts));
    const skus: any[] = arrValues.filter((it: any) =>
        it["attributes"]["group"] === "NGW:NatGateway"
        && it["attributes"]["operation"] === "NatGateway"
        && it["attributes"]["usagetype"].endsWith("NatGateway-Hours") // prefixed with region abbreviation on some regions
    );
    if (skus.length > 1) {
        console.log("Shouldn't find more than one sku. Continuing with first...");
    }

    const sku = skus[0]["sku"];
    const hourlyPrice = getHourlyOnDemandPrice(pricingDataTermsOnDemand, sku);
    return getMonthlyCost(hourlyPrice);
}

const getHourlyOnDemandPrice = function (pricingDataTermsOnDemand: any, sku: string): (number) {
    const skuCode = `${sku}.JRTCKXETXF`; // JRTCKXETXF = On demand offer term code
    const skuPricing: any = pricingDataTermsOnDemand[sku][skuCode];

    const priceRateCode = `${skuCode}.6YS6EN2CT7`; // 6YS6EN2CT7 = Price per hour rate code
    const priceDimension: any = skuPricing["priceDimensions"][priceRateCode];

    const pricePerHour = Number(priceDimension["pricePerUnit"]["USD"]);

    return pricePerHour;
}

// speed things up - for 20 instances this reduces time from ~30s to ~10s
const fastGetMonthlyInstanceOnDemandPrice = memoize(getMonthlyInstanceOnDemandPrice);

export const calculateEstimatedCosts = function (resources: policy.PolicyResource[]): CostItems[] {
    const costItems: CostItems[] = [];

    // Find _all_ instances
    const instanceCostData = calculateInstanceCosts(resources);
    costItems.push(...instanceCostData);

    // Find _all_ Auto Scaling Groups
    const asgCostData = calculateAsgCosts(resources);
    costItems.push(...asgCostData);

    // Find _all_ NAT Gateways
    const natGatewayCostData = calculateNatGatewayCosts(resources);
    costItems.push(...natGatewayCostData);

    if (costItems?.length === 0) {
        return [];
    }

    // Sum each monthlyTotal to get TOTAL monthly cost.
    let totalCost = 0;
    costItems.forEach((v) => {
        totalCost += v.monthlyTotal;
    })
    costItems.push({ resource: "TOTAL", monthlyTotal: totalCost, isFinalTotal: true });

    return costItems;
}

const calculateInstanceCosts = function (resources: policy.PolicyResource[]): CostItems[] {
    // Find _all_ instances
    const instances = resources.map(r => r.asType(aws.ec2.Instance)).filter(b => b);
    if (!instances.length) { return [] };

    // Aggregate instance type counts
    const resourceCounts = new Map<string, number>();
    instances.forEach(it => {
        const instanceType = it!.instanceType;
        if (resourceCounts.get(instanceType) === undefined) {
            // initialize a preliminary cost of '0.0`
            resourceCounts.set(instanceType, 0);
        }
        const resourceCount = resourceCounts.get(instanceType)! + 1;
        resourceCounts.set(instanceType, resourceCount)
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

const calculateNatGatewayCosts = function (resources: policy.PolicyResource[]): CostItems[] {
    // Find _all_ instances
    const natGateways = resources.map(r => r.asType(aws.ec2.NatGateway)).filter(b => b);
    if (!natGateways.length) { return [] };

    const price = getMonthlyNatGatewayOnDemandPrice();
    const v = natGateways.length; // v to be consistent with other similar methods
    const totalMonthylResourceCost = natGateways.length * price;

    return [{ resource: getPulumiType(aws.ec2.NatGateway), qty: v, unitCost: price, monthlyTotal: totalMonthylResourceCost }];
}

const calculateAsgCosts = function (resources: policy.PolicyResource[]) {
    // Find _all_ autoscaling groups
    const asgs = resources.map(r => r.asType(aws.autoscaling.Group)).filter(b => b);
    if (!asgs.length) { return [] };

    // Aggregate instance type counts
    const resourceCounts = new Map<string, number>();
    asgs.forEach(it => {
        let instanceType = undefined;
        if (it?.launchConfiguration !== undefined) {
            const launchConfiguration = resources.find(res => isType(res.type, aws.ec2.LaunchConfiguration) && res.props.name === it.launchConfiguration);
            instanceType = launchConfiguration?.props.instanceType;

        } else if (it?.launchTemplate !== undefined) {
            const launchTemplate = resources.find(res => isType(res.type, aws.ec2.LaunchTemplate) && res.props.name === it!.launchTemplate!.name);
            instanceType = launchTemplate?.props.instanceType;
        }

        if (resourceCounts.get(instanceType) === undefined) {
            // initialize a preliminary cost of '0.0`
            resourceCounts.set(instanceType, 0);
        }

        const resourceCount = resourceCounts.get(instanceType)! + it!.minSize;
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
};
