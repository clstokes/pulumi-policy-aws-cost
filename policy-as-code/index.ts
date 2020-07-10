import { PolicyPack, } from "@pulumi/policy";

import { s3Policies } from "./s3";
import { computePolicies } from "./compute";
import { costPolicies } from "./cost";

new PolicyPack("aws-policies", {
    policies: [
        ...s3Policies,
        ...computePolicies,
        ...costPolicies,
    ],
});
