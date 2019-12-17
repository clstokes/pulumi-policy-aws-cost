import * as aws from "@pulumi/aws";
import { validateTypedResource, Policies, } from "@pulumi/policy";
import { isType, requireTags, getMonthlyOnDemandPrice, formatAmount, } from "./utils";
import { maxSubnetPrefixLength, maxMonthlyCost } from "./config";

export const computePolicies: Policies = [
    {
        name: "subnet-sizing",
        description: `Subnets must be /${maxSubnetPrefixLength} or smaller.`,
        enforcementLevel: "mandatory",
        validateResource: validateTypedResource(aws.ec2.Subnet, (subnet, _, reportViolation) => {
            const prefixLength = subnet.cidrBlock.split("/");
            const prefixLengthAsNumber = Number.parseInt(prefixLength[1]);
            if (prefixLengthAsNumber < maxSubnetPrefixLength) {
                reportViolation(`Address space [${subnet.cidrBlock}] is too large. Must be [/${maxSubnetPrefixLength}] or smaller.`)
            }
        }),
    },
    {
        name: "instance-required-tags",
        description: "Instances must have required tags.",
        enforcementLevel: "mandatory",
        validateResource: validateTypedResource(aws.ec2.Instance, (instance, _, reportViolation) => {
            requireTags(instance.tags, ["Name", "BusinessUnit", "CostCenter",], reportViolation);
        }),
    },
    {
        name: "instance-cost-estimate",
        description: `Limit instance costs to $${maxMonthlyCost}.`,
        enforcementLevel: "mandatory",
        validateStack: (args, reportViolation) => {
            // Find _all_ instances
            const instances = args.resources.filter(it => isType(it.type, aws.ec2.Instance));

            // Aggregate costs
            let totalMonthlyAmount = 0;
            instances.forEach(it => {
                totalMonthlyAmount += getMonthlyOnDemandPrice(it.props.instanceType);
            });

            if (totalMonthlyAmount > maxMonthlyCost) {
                reportViolation(`Estimated monthly cost [${formatAmount(totalMonthlyAmount)}] exceeds [${formatAmount(maxMonthlyCost)}].`);
            }
        },
    },
];
