import * as policy from "@pulumi/policy";
import * as pulumi from "@pulumi/pulumi";

export const requireTags = function (tags: any, tagsToCheck: string[], reportViolation: policy.ReportViolation) {
    for (let tagName of tagsToCheck) {
        if ((tags || {})[tagName] === undefined) {
            reportViolation(`Tag [${tagName}] must be defined.`);
        }
    }
};

export const isType = function (actual: string, expected: any): boolean {
    return actual === getPulumiType(expected);
}

export const getPulumiType = function (resource: any): (string) {
    return (<any>resource)["__pulumiType"];
}

export interface CostItems {
    resource: string,
    type?: string,
    qty?: number,
    unitCost?: number,
    monthlyTotal: number,
    isFinalTotal?: boolean,
}

export const formatAmount = function (amount: string | number): (string) {
    if (typeof amount == 'string') {
        amount = parseFloat(amount);
    }

    if (isNaN(amount)) {
        return ''; // must return a string otherwise colunify through a "Cannot read property 'trim' of undefined"
    }

    return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // 20.12345678 -> $20.12
}

export const getMonthlyCost = function (pricePerHour: number): number {
    return pricePerHour * 24 * 30;
}

export const columnifyConfig = {
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
