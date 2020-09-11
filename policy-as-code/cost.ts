import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Policies, validateResourceOfType, } from "@pulumi/policy";

import { isType, getMonthlyOnDemandPrice, formatAmount, } from "./utils";

export const costPolicies: Policies = [
    {
        name: "budget-limit",
        description: `Estimated costs must not exceed monthly budget.`,
        enforcementLevel: "mandatory",
        configSchema: {
            properties: {
                maxMonthlyCost: {
                    type: "number",
                    default: 50.0,
                },
            },
        },
        validateStack: (args, reportViolation) => {
            // speed things up - for 20 instances this reduces time from ~30s to ~10s. Moving this 'globally' within the file seems to have no effect.
            const memoize = require('fast-memoize');
            const fastGetMonthlyOnDemandPrice = memoize(getMonthlyOnDemandPrice);

            const { maxMonthlyCost } = args.getConfig<{ maxMonthlyCost: number }>();

            // Find _all_ instances
            const instances = args.resources.filter(it => isType(it.type, aws.ec2.Instance));

            // Aggregate costs
            let totalMonthlyAmount = 0;
            instances.forEach(it => {
                totalMonthlyAmount += fastGetMonthlyOnDemandPrice(it.props.instanceType);
            });

            if (totalMonthlyAmount > maxMonthlyCost) {
                reportViolation(`Estimated monthly cost [${formatAmount(totalMonthlyAmount)}] exceeds [${formatAmount(maxMonthlyCost)}].`);
            }
        },
    },
    {
        name: "aggregate-instance-cost-estimate",
        description: `Estimated instance costs based on instance type.`,
        enforcementLevel: "advisory",
        validateStack: (args, reportViolation) => {
            // speed things up - for 20 instances this reduces time from ~30s to ~10s. Moving this 'globally' within the file seems to have no effect.
            const memoize = require('fast-memoize');
            const fastGetMonthlyOnDemandPrice = memoize(getMonthlyOnDemandPrice);

            // Find _all_ instances
            const instances = args.resources.filter(it => isType(it.type, aws.ec2.Instance));

            // Aggregate costs
            const aggregateCosts = new Map<string, number>();
            instances.forEach(it => {
                if (aggregateCosts.get(it.props.instanceType) === undefined) {
                    aggregateCosts.set(it.props.instanceType, 0.0); // IS THIS NECESSARY?
                }
                const monthlyInstanceCost = fastGetMonthlyOnDemandPrice(it.props.instanceType);
                const aggregateInstanceCost = monthlyInstanceCost + aggregateCosts.get(it.props.instanceType)!;
                aggregateCosts.set(it.props.instanceType, aggregateInstanceCost)
            });

            const costLines: string[] = [];
            aggregateCosts.forEach((k, v) => {
                costLines.push(`${k} = ${v}`);
            });
            reportViolation(costLines.join('\n'));
        },
    },
];
