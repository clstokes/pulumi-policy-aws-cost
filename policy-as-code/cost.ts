import * as aws from "@pulumi/aws";
import { Policies, } from "@pulumi/policy";

import { isType, getMonthlyOnDemandPrice, formatAmount, } from "./utils";

export const costPolicies: Policies = [
    {
        name: "instance-cost-estimate",
        description: `Estimated costs must not exceed monthly budget.`,
        enforcementLevel: "mandatory",
        configSchema: {
            properties: {
                maxMonthlyCost: {
                    type: "number",
                    default: 500.0,
                },
            },
        },
        validateStack: (args, reportViolation) => {
            const { maxMonthlyCost } = args.getConfig<{ maxMonthlyCost: number }>();

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
