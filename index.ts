import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

import * as ami from "./ami";

const instanceTypes = [
    aws.ec2.T2InstanceMedium,
    aws.ec2.M5aInstanceLarge,
    aws.ec2.G3Instance4XLarge, // Remove/comment this type to pass cost policy
];

/**
 * Resources
 */
const privateNetwork = "10.0.0.0/16";
const publicInternet = "0.0.0.0/0";

// create a vpc
const vpc = new awsx.ec2.Vpc("web-vpc", {
    numberOfAvailabilityZones: 1,
    subnets: [{ type: "public" }],
    tags: {
        Name: "web-vpc",
    }
});

// create a security group
const webSg = new aws.ec2.SecurityGroup("web-firewall", {
    vpcId: vpc.id,
    name: "web-firewall",
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: [privateNetwork] },
    ],
});

// create a instance
instanceTypes.forEach((type, i) => {
    const webServer = new aws.ec2.Instance(`web-server-${i}`, {
        tags: {
            "project": "demo",
            "Name": "web-server",
        },
        instanceType: type,
        associatePublicIpAddress: false,
        ami: ami.amiId,                   // reference from "./ami"
        subnetId: vpc.publicSubnetIds[0], // reference the subnet created by awsx
        vpcSecurityGroupIds: [webSg.id],  // reference the group created above
    });
});
