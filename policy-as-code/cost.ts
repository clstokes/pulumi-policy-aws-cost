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
            const resourceCounts = new Map<string, number>();
            instances.forEach(it => {
                if (resourceCounts.get(it.props.instanceType) === undefined) {
                    // initiate a preliminary cost of '0.0`
                    resourceCounts.set(it.props.instanceType, 0);
                }
                const resourceCount = resourceCounts.get(it.props.instanceType)! + 1;
                resourceCounts.set(it.props.instanceType, resourceCount)
            });

            const costItems: any[] = [];
            let totalCost = 0;
            resourceCounts.forEach((v, k) => {
                const price = fastGetMonthlyOnDemandPrice(k);
                const totalMonthylResourceCost = v * price;
                costItems.push({ resource: (<any>aws.ec2.Instance)["__pulumiType"], type: k, qty: v, price: formatAmount(price), "monthly cost": formatAmount(totalMonthylResourceCost) });
                totalCost += totalMonthylResourceCost;
            });
            costItems.push({ resource: "TOTAL", "monthly cost": formatAmount(totalCost) });

            const columnify = require('columnify');
            const outputData = columnify(
                costItems,
                {
                    config: {
                        resource: { minWidth: 30, },
                        type: { minWidth: 15, },
                        qty: { minWidth: 5, align: 'right', },
                        price: { minWidth: 10, align: 'right', },
                        "monthly cost": { minWidth: 14, align: 'right', },
                    }
                }
            );
            reportViolation('\n' + outputData);
        },
    },
];
