import { PolicyPack, } from "@pulumi/policy";

import { costPolicies } from "./cost";

new PolicyPack("cost-optimization", {
    policies: [
        ...costPolicies,
    ],
});
