import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import { BASE_TAGS, amiId, zones } from "./config";

const config = new pulumi.Config();

/**
 * VPC-related resources
 */
export const vpc = new aws.ec2.Vpc("demo", {
    cidrBlock: "10.0.0.0/16",
    tags: {
        ...BASE_TAGS,
        Name: "demo",
    },
});

export const subnet = new aws.ec2.Subnet("demo", {
    vpcId: vpc.id,
    availabilityZoneId: zones.then(z => z.names[0]),
    cidrBlock: `10.0.0.0/22`,
    mapPublicIpOnLaunch: false,
    tags: {
        ...BASE_TAGS,
        Name: "demo",
    },
}, { parent: vpc, });

/**
 * Instances
 */
const instanceCount = config.get("instanceCount") ?? 5;

export const instances: aws.ec2.Instance[] = []
for (let i = 0; i < instanceCount; i++) {
    const instance = new aws.ec2.Instance(`demo-${i}`, {
        instanceType: aws.ec2.InstanceTypes.M5d_XLarge,
        subnetId: subnet.id,
        ami: amiId,
        tags: {
            ...BASE_TAGS,
            Name: `demo-${i}`,
        },
    });
    instances.push(instance);
}

const instance = new aws.ec2.Instance(`expensive-server`, {
    instanceType: aws.ec2.InstanceTypes.I3_16XLarge,
    subnetId: subnet.id,
    ami: amiId,
    tags: {
        ...BASE_TAGS,
    },
});
