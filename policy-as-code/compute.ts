import * as aws from "@pulumi/aws";
import { validateResourceOfType, Policies, } from "@pulumi/policy";

import { requireTags, } from "./utils";

export const computePolicies: Policies = [
    {
        name: "subnet-sizing",
        description: `Subnets CIDR block size is too large.`,
        enforcementLevel: "mandatory",
        configSchema: {
            properties: {
                maxSubnetPrefixLength: {
                    type: "number",
                    default: 22,
                },
            },
        },
        validateResource: validateResourceOfType(aws.ec2.Subnet, (resource, args, reportViolation) => {
            const { maxSubnetPrefixLength } = args.getConfig<{ maxSubnetPrefixLength: number }>();
            
            const prefixLength = resource.cidrBlock.split("/");
            const prefixLengthAsNumber = Number.parseInt(prefixLength[1]);
            if (prefixLengthAsNumber < maxSubnetPrefixLength) {
                reportViolation(`Address space [${resource.cidrBlock}] is too large. Must be [/${maxSubnetPrefixLength}] or smaller.`)
            }
        }),
    },
    {
        name: "instance-required-tags",
        description: "Instances must have required tags.",
        enforcementLevel: "mandatory",
        validateResource: validateResourceOfType(aws.ec2.Instance, (resource, _, reportViolation) => {
            requireTags(resource.tags, ["Name", "BusinessUnit", "CostCenter",], reportViolation);
        }),
    },
];
