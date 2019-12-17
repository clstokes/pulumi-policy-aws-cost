import { PolicyPack, } from "@pulumi/policy";
import { s3Policies } from "./s3";
import { computePolicies } from "./compute";

new PolicyPack("aws-policies", {
    policies: [
        ...s3Policies,
        ...computePolicies,
    ],
});
