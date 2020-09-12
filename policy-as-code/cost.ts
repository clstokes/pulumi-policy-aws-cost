import * as aws from "@pulumi/aws";
import { Policies, validateResourceOfType, } from "@pulumi/policy";

import * as os from "os";

import { isType, getPulumiType, fastGetMonthlyInstanceOnDemandPrice, formatAmount, } from "./utils";

export const costPolicies: Policies = [
    {
        name: "budget-limit",
        description: `Estimated costs must not exceed monthly budget.`,
        enforcementLevel: "advisory",
        configSchema: {
            properties: {
                maxMonthlyCost: {
                    type: "number",
                    default: 50.0,
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
                totalMonthlyAmount += fastGetMonthlyInstanceOnDemandPrice(it.props.instanceType);
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
            // Find _all_ instances
            const instances = args.resources.filter(it => isType(it.type, aws.ec2.Instance));

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
            const costItems: any[] = [];
            let totalCost = 0;
            resourceCounts.forEach((v, k) => {
                const price = fastGetMonthlyInstanceOnDemandPrice(k);
                const totalMonthylResourceCost = v * price;
                costItems.push({ resource: getPulumiType(aws.ec2.Instance), type: k, qty: v, price: price, "monthly cost": totalMonthylResourceCost });
                totalCost += totalMonthylResourceCost;
            });
            costItems.push({ resource: "TOTAL", "monthly cost": totalCost });

            const columnify = require('columnify');
            const outputData = columnify(costItems, columnifyConfig);
            reportViolation('\n' + outputData);

            // writeFile(`${os.homedir}/cost-${new Date().toISOString()}.json`, JSON.stringify(costItems));
        },
    },
];

const columnifyConfig = {
    config: {
        resource: { minWidth: 30, },
        type: { minWidth: 15, },
        qty: { minWidth: 5, align: 'right', },
        price: {
            minWidth: 14,
            align: 'right',
            dataTransform: formatAmount,
        },
        "monthly cost": {
            minWidth: 14,
            align: 'right',
            dataTransform: formatAmount,
        },
    }
};
