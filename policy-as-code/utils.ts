import { Resource, } from "@pulumi/pulumi";

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
