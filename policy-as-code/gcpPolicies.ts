import * as pulumi from "@pulumi/pulumi";
import { Policies, } from "@pulumi/policy";

import { columnifyConfig, formatAmount, writeFile, } from "./utils";
import { calculateEstimatedCosts, } from "./gcpCostUtils";

export const costPolicies: Policies = [
    {
        name: "gcp-budget-limit",
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
        name: "gcp-cost-estimate",
        description: `Estimated monthly costs.`,
        enforcementLevel: "advisory",
        validateStack: (args, reportViolation) => {

            // get all estimated cost data
            const costItems = calculateEstimatedCosts(args.resources);
            if (costItems.length === 0) {
                return;
            }

            const columnify = require('columnify');
            const outputData = columnify(costItems, columnifyConfig);
            reportViolation('\n' + outputData);

            // writeFile(`${require("os").homedir}/Desktop/cost-${new Date().toISOString()}.json`, JSON.stringify(costItems));
        },
    },
];
