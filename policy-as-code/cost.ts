import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { Policies, } from "@pulumi/policy";

import { isType, calculateEstimatedCosts, formatAmount, } from "./utils";

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

            const costItems = calculateEstimatedCosts(args.resources);
            const totalMonthlyCostItem = costItems.find(it => it.isFinalTotal)!;
            const totalMonthlyCost = totalMonthlyCostItem?.monthlyTotal;

            if (totalMonthlyCost > maxMonthlyCost) {
                reportViolation(`Estimated monthly cost [${formatAmount(totalMonthlyCost)}] exceeds [${formatAmount(maxMonthlyCost)}].`);
            }
        },
    },
    {
        name: "aggregate-instance-cost-estimate",
        description: `Estimated instance costs based on instance type.`,
        enforcementLevel: "advisory",
        validateStack: (args, reportViolation) => {

            const costItems = calculateEstimatedCosts(args.resources);

            const columnify = require('columnify');
            const outputData = columnify(costItems, columnifyConfig);
            reportViolation('\n' + outputData);

            // writeFile(`${require("os").homedir}/Desktop/cost-${new Date().toISOString()}.json`, JSON.stringify(costItems));
        },
    },
];

const columnifyConfig = {
    columns: ["resource", "type", "qty", "unitCost", "monthlyTotal",],
    config: {
        resource: { minWidth: 30, },
        type: { minWidth: 15, },
        qty: { minWidth: 5, align: 'right', },
        unitCost: {
            minWidth: 14,
            align: 'right',
            dataTransform: formatAmount,
            headingTransform: () => { return "PRICE" },
        },
        monthlyTotal: {
            minWidth: 14,
            align: 'right',
            dataTransform: formatAmount,
            headingTransform: () => { return "MONTHLY COST" },
        },
    }
};

export const writeFile = function (filePath: string, fileData: string) {
    // do inline requires here to not "pollute" the file when this is rarely used
    const absoluteFilePath = require("path").resolve(filePath);
    pulumi.log.info(`Writing file to [${absoluteFilePath}]`);
    require("fs").writeFileSync(absoluteFilePath, fileData);
    return;
};
