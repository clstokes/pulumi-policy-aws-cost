import * as aws from "@pulumi/aws";
import { PolicyPack, } from "@pulumi/policy";
import { getPricingData, formatAmount, isType, } from "./utils";

const pricingData: any = getPricingData();
const pricingDataProducts: any = pricingData["products"];
const pricingDataTermsOnDemand: any = pricingData["terms"]["OnDemand"];

const MAX_MONTHLY_AMOUNT = 500;

const policies = new PolicyPack("ec2", {
    policies: [
        {
            name: "instance-cost-estimate",
            description: `Limit instance costs to $${MAX_MONTHLY_AMOUNT}.`,
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

const getMonthlyOnDemandPrice = function (instanceType: string): (number) {
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
    console.log(`Monthly cost of [${instanceType}] is [$${costPerMonth}].`); // TODO: Remove
    return costPerMonth;
}
