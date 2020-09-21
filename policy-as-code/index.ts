import { PolicyPack, } from "@pulumi/policy";

import { costPolicies as gcpCostPolicies } from "./gcp";
import { costPolicies as awsCostPolicies } from "./aws";

new PolicyPack("cost-optimization", {
    policies: [
        ...awsCostPolicies,
        ...gcpCostPolicies,
    ],
});
