import * as pulumi from "@pulumi/pulumi";
import * as policy from "@pulumi/policy";
import * as gcp from "@pulumi/gcp";

import { getPulumiType, isType, getMonthlyCost, CostItem, } from "./utils";

import * as fs from "fs";
const parse = require('csv-parse/lib/sync')
import * as zlib from "zlib";

const memoize = require("fast-memoize");

/**
 * Cost-related helpers
 */
const getPricingData = function (): any[] {
    const localFilePath = "./resources/gcp/ondemand-pricing.csv.gz";
    if (!fs.existsSync(localFilePath)) {
        throw new Error(`Unable to load local pricing file [${localFilePath}]`);
    }

    const localPricingDataGz = fs.readFileSync(localFilePath);
    const localPricingData = zlib.gunzipSync(localPricingDataGz);

    const results: any[] = parse(localPricingData, {
        columns: true,
        skip_empty_lines: true
    });
    return results;
}

const getMonthlyInstanceOnDemandPrice = function (instanceType: string): (number) {
    const instanceComponents = instanceType.match(/([a-z0-9]+)-([a-z]+)-([0-9]+)/); // "n1-standard-1" = [n1-standard-1,n1,standard,1]
    const instanceSkuDescription = getInstanceSkuDescription(instanceComponents![1]);

    const pricingData: any = getPricingData();
    const skus: any[] = pricingData.filter((it: any) =>
        it["Unit description"] === "hour"
        && it["Product taxonomy"] === "GCP > Compute > GCE > VMs On Demand > Cores: Per Core"
        && it["SKU description"] === instanceSkuDescription
    );

    // TODO: Aggregate costs for `N1 Predefined Instance Ram running in Americas`

    if (skus.length === 0) {
        pulumi.log.info(`Unable to determine sku for [${instanceType}]`);
        return 0;
    }
    else if (skus.length > 1) {
        console.log("Shouldn't find more than one sku. Continuing with first...");
    }

    const sku = skus[0];
    const hourlyPricePerCore = sku["List price ($)"];
    const hourlyPrice = hourlyPricePerCore * parseInt(instanceComponents![3]);
    return getMonthlyCost(hourlyPrice);
}

const getInstanceSkuDescription = function (instanceFamily: string): (string | undefined) {
    const skuMapping = new Map<string, any>();
    skuMapping.set("c2", () => `Compute optimized Core running in Americas`);
    skuMapping.set("e2", (family: string) => `${family.toUpperCase()} Instance Core running in Americas`);
    skuMapping.set("m1", () => `Memory-optimized Instance Core running in Americas`);
    skuMapping.set("n1", (family: string) => `${family.toUpperCase()} Predefined Instance Core running in Americas`);
    skuMapping.set("n2", (family: string) => `${family.toUpperCase()} Custom Instance Core running in Americas`);
    skuMapping.set("n2d", (family: string) => `${family.toUpperCase()} AMD Instance Core running in Americas`);

    const skuDescriptionFn = skuMapping.get(instanceFamily);
    if (skuDescriptionFn === undefined) {
        return undefined;
    }
    const skuDescription = skuDescriptionFn(instanceFamily);
    return skuDescription;
}

// speed things up - for 20 instances this reduces time from ~30s to ~10s
const fastGetMonthlyInstanceOnDemandPrice = memoize(getMonthlyInstanceOnDemandPrice);

export const calculateEstimatedCosts = function (resources: policy.PolicyResource[]): CostItem[] {
    const costItems: CostItem[] = [];

    // Find _all_ instances
    const instanceCostData = calculateInstanceCosts(resources);
    costItems.push(...instanceCostData);

    // Find _all_ GKE clusters
    const gkeNodeCostData = calculateGkeCosts(resources);
    costItems.push(...gkeNodeCostData);

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

const calculateInstanceCosts = function (resources: policy.PolicyResource[]): CostItem[] {
    // Find _all_ instances
    const instances = resources.map(r => r.asType(gcp.compute.Instance)).filter(b => b);
    if (!instances.length) { return [] };

    // Aggregate instance type counts
    const resourceCounts = new Map<string, number>();
    instances.forEach(it => {
        const machineType = it!.machineType;
        if (resourceCounts.get(machineType) === undefined) {
            // initialize a preliminary cost of '0.0`
            resourceCounts.set(machineType, 0);
        }
        const resourceCount = resourceCounts.get(machineType)! + 1;
        resourceCounts.set(machineType, resourceCount)
    });

    // Aggregate costs
    const costItems: CostItem[] = [];
    resourceCounts.forEach((v, k) => {
        const price = fastGetMonthlyInstanceOnDemandPrice(k);
        const totalMonthlyResourceCost = v * price;
        costItems.push({ resource: getPulumiType(gcp.compute.Instance), type: k, qty: v, unitCost: price, monthlyTotal: totalMonthlyResourceCost });
    });

    return costItems;
}

const calculateGkeCosts = function (resources: policy.PolicyResource[]): CostItem[] {
    const costItems: CostItem[] = [];

    const costFn = (resourceType: string, nodeType: string, v: number): CostItem => {
        const price = fastGetMonthlyInstanceOnDemandPrice(nodeType);
        const totalMonthlyResourceCost = v * price;
        const costItem = { resource: resourceType, type: nodeType, qty: v, unitCost: price, monthlyTotal: totalMonthlyResourceCost };
        return costItem;
    };

    // gcp:container/cluster:Cluster
    const clusters = resources
        .filter(r => isType(r.type, gcp.container.Cluster));

    if (clusters.length > 0) {
        const hourlyClusterPrice = 0.1; // TODO: Lookup from pricing data instead of hard-coding.
        costItems.push({
            resource: `${getPulumiType(gcp.container.Cluster)}`,
            qty: clusters.length,
            unitCost: hourlyClusterPrice,
            monthlyTotal: getMonthlyCost(hourlyClusterPrice)
        });
    }

    // Actual default is `e2-medium`, but we modify it to `e2-medium-2` to simplify the code.
    // per https://cloud.google.com/kubernetes-engine/docs/reference/rest/v1/NodeConfig
    const defaultMachineType = "e2-medium-2";

    // gcp:container/cluster:Cluster#Nodes
    resources
        .map(r => r.asType(gcp.container.Cluster))
        .filter(i => i?.nodeConfig !== undefined)
        .forEach(it => {
            if (it?.removeDefaultNodePool) {
                return;
            }
            costItems.push(costFn(
                `${getPulumiType(gcp.container.Cluster)}#Nodes`,
                it!.nodeConfig?.machineType || defaultMachineType,
                it!.initialNodeCount || 1,
            ));
        });

    // gcp:container/nodePool:NodePool
    resources
        .map(r => r.asType(gcp.container.NodePool))
        .filter(it => it?.nodeConfig !== undefined)
        .forEach(it => {
            costItems.push(costFn(
                `${getPulumiType(gcp.container.NodePool)}`,
                it!.nodeConfig?.machineType || defaultMachineType,
                it!.initialNodeCount || 1,
            ));
        });

    return costItems;
}
