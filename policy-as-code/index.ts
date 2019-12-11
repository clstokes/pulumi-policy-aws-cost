import * as AWS from "aws-sdk";

import * as aws from "@pulumi/aws";
import { PolicyPack, } from "@pulumi/policy";

import { formatAmount, isType, } from "./utils";

const MAX_MONTHLY_AMOUNT = 500;

const policies = new PolicyPack("ec2", {
    policies: [
        {
            name: "instance-cost-estimate",
            description: `Limit instance costs to ${formatAmount(MAX_MONTHLY_AMOUNT)}.`,
            enforcementLevel: "mandatory",
            validateStack: (args, reportViolation) => {
                const instances = args.resources.filter(it => isType(it.type, aws.ec2.Instance));
                let totalMonthlyAmount = 0;
                instances.forEach(it => {
                    totalMonthlyAmount += getMonthlyOnDemandPrice(it.props.instanceType);
                });
                console.log(`Estimated monthly cost of [${instances.length}] instances is [${formatAmount(totalMonthlyAmount)}]`); // TODO: Remove
                if (totalMonthlyAmount > MAX_MONTHLY_AMOUNT) {
                    reportViolation(`Estimated monthly cost [${formatAmount(totalMonthlyAmount)}] exceeds [${formatAmount(MAX_MONTHLY_AMOUNT)}].`);
                }
            },
        },
    ],
});

const getMonthlyOnDemandPrice = function (instanceType: string): number {

    const params = getProductsRequest(instanceType);

    // Pricing API is only available in us-east-1
    const pricing = new AWS.Pricing({ region: "us-east-1" });

    const data = await pricing.getProducts(params).promise();
    if (data.PriceList === undefined || data.PriceList[0] === undefined) throw new Error("PriceList is undefined");

    const item = (<any>data.PriceList[0]);
    const sku = item["product"]["sku"];
    const pricingDataTermsOnDemand = item["terms"]["OnDemand"];

    const skuCode = `${sku}.JRTCKXETXF`; // JRTCKXETXF = On demand offer term code
    const skuPricing: any = pricingDataTermsOnDemand[skuCode];

    const priceRateCode = `${skuCode}.6YS6EN2CT7`; // 6YS6EN2CT7 = Price per hour rate code
    const priceDimension: any = skuPricing["priceDimensions"][priceRateCode];

    const pricePerHour = Number(priceDimension["pricePerUnit"]["USD"]);
    const costPerMonth = pricePerHour * 24 * 30;
    console.log(`Monthly cost of [${instanceType}] is [$${costPerMonth}].`); // TODO: Remove
    return costPerMonth;
};

const getProductsRequest = function (instanceType: string): AWS.Pricing.Types.GetProductsRequest {
    return {
        ServiceCode: "AmazonEC2",
        Filters: [
            termMatch("InstanceType", instanceType),
            termMatch("UsageType", `BoxUsage:${instanceType}`),
            termMatch("operation", "RunInstances"),
            termMatch("locationType", "AWS Region"),
            termMatch("Tenancy", "Shared"),
            termMatch("OperatingSystem", "Linux"),
            termMatch("PreInstalledSw", "NA"),
        ]
    };
}

const termMatch = function (field: string, value: string): any {
    return {
        Type: "TERM_MATCH",
        Field: field,
        Value: value,
    };
};
