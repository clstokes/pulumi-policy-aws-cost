import * as aws from "@pulumi/aws";
import { BASE_TAGS, amiId, zoneIds } from "./config";

const vpc = new aws.ec2.Vpc("demo", {
    cidrBlock: "10.0.0.0/16",
    tags: {
        ...BASE_TAGS,
        Name: "demo",
    },
});

const subnets = zoneIds.map((zoneId, i) => {
    return new aws.ec2.Subnet(`demo-${i}`, {
        vpcId: vpc.id,
        availabilityZoneId: zoneId,
        cidrBlock: `10.0.${i}.0/22`,
        tags: {
            ...BASE_TAGS,
            Name: `demo-${i}`,
        },
    }, { parent: vpc, })
});

const instances = subnets.map((subnet, i) => {
    return new aws.ec2.Instance(`demo-${i}`, {
        subnetId: subnet.id,
        ami: amiId,
        instanceType: aws.ec2.M5dInstanceXLarge,
        tags: {
            ...BASE_TAGS,
            // Name: `demo-${i}`,
        },
    }, { parent: subnet });
});

export const vpcId = vpc.id;
export const subnetIds = subnets.map(it => it.id);
export const instanceIds = instances.map(it => it.id);
