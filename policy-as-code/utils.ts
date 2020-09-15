import * as policy from "@pulumi/policy";

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
