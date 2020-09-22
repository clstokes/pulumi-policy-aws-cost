import { PolicyPack, } from "@pulumi/policy";

import { costPolicies as awsCostPolicies } from "./awsPolicies";
import { costPolicies as gcpCostPolicies } from "./gcpPolicies";

new PolicyPack("cost-optimization", {
    policies: [
        ...awsCostPolicies,
        ...gcpCostPolicies,
    ],
});
