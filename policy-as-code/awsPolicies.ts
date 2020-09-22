import * as pulumi from "@pulumi/pulumi";
import { Policies, } from "@pulumi/policy";

import { newColumnifyConfig, formatAmount, writeFile, } from "./utils";
import { calculateEstimatedCosts, } from "./awsCostUtils";

export const costPolicies: Policies = [
    {
        name: "aws-budget-limit",
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

            // get all estimated cost data
            const costItems = calculateEstimatedCosts(args.resources);

            // get MONTHLY COST total
            const totalMonthlyCostItem = costItems.find(it => it.isFinalTotal)!;
            const totalMonthlyCost = totalMonthlyCostItem?.monthlyTotal;

            if (totalMonthlyCost > maxMonthlyCost) {
                reportViolation(`Estimated monthly cost [${formatAmount(totalMonthlyCost)}] exceeds [${formatAmount(maxMonthlyCost)}].`);
            }
        },
    },
    {
        name: "aws-cost-estimate",
        description: `Estimated monthly costs.`,
        enforcementLevel: "advisory",
        validateStack: (args, reportViolation) => {

            // get all estimated cost data
            const costItems = calculateEstimatedCosts(args.resources);
            if (costItems.length === 0) {
                return;
            }

            const columnify = require('columnify');
            const outputData = columnify(costItems, newColumnifyConfig());
            reportViolation('\n' + outputData);

            // writeFile(`${require("os").homedir}/Desktop/cost-${new Date().toISOString()}.json`, JSON.stringify(costItems));
        },
    },
];
