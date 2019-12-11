import { Resource, } from "@pulumi/pulumi";
import * as fs from "fs";

export const getPricingData = function (): (any) {
    const localFilePath = "./../resources/offers-ec2-us-east-1.json";
    if (!fs.existsSync(localFilePath)) {
        throw new Error("Local pricing file is missing - run `make bootstrap` and try again. Exiting...")
    }
    const localPricingData = fs.readFileSync(localFilePath).toString();
    return JSON.parse(localPricingData);
}

export const formatAmount = function (amount: number): (string) {
    return '$' + amount.toFixed(2);
}

/**
 * Uses an internal value `__pulumiType` to check the type of the provided resource.
 * TODO: Remove once https://github.com/pulumi/pulumi-policy/issues/158 is implemented.
 *
 * @param {string} actual
 * @param {{ new(name: string, args: TArgs, ...rest: any[]): TResource; }} expected
 * @returns {boolean}
 */
export const isType = function <TResource extends Resource, TArgs>(
    actual: string,
    expected: { new(name: string, args: TArgs, ...rest: any[]): TResource; }
): boolean {
    return actual === (<any>expected).__pulumiType;
}
