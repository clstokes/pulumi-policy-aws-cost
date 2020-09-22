import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

import { BASE_TAGS, projectName, } from "./config";

const config = new pulumi.Config();

const instanceCount = config.get("instanceCount") ?? 5;

const instances: gcp.compute.Instance[] = []
for (let i = 0; i < instanceCount; i++) {
    const instance = new gcp.compute.Instance(`demo-${i}`, {
        zone: gcp.compute.getZones().then(it => it.names[0]),
        bootDisk: {
            initializeParams: {
                image: "ubuntu-os-cloud/ubuntu-1804-lts",
            },
        },
        machineType: "n1-standard-16",
        metadata: {
            ...BASE_TAGS,
            Name: `${projectName}-demo-${i}`,
        },
        networkInterfaces: [{
            accessConfigs: [{}],
        }],
    });
    instances.push(instance);
}

const expensiveServer = new gcp.compute.Instance("expensive", {
    zone: gcp.compute.getZones().then(it => it.names[0]),
    bootDisk: {
        initializeParams: {
            image: "ubuntu-os-cloud/ubuntu-1804-lts",
        },
    },
    machineType: "m1-ultramem-80",
    metadata: {
        ...BASE_TAGS,
        Name: `${projectName}-server`,
    },
    networkInterfaces: [{
        accessConfigs: [{}],
    }],
});

const intanceTemplate = new gcp.compute.InstanceTemplate("ig", {
    machineType: "n2-standard-48",
    disks: [{
        boot: true,
        sourceImage: "ubuntu-os-cloud/ubuntu-1804-lts",
    }],
})

const instanceGroup = new gcp.compute.InstanceGroupManager("ig", {
    baseInstanceName: "ig",
    versions: [
        {
            instanceTemplate: intanceTemplate.id,
            targetSize: { fixed: 12 },
        }
    ],
});

// TODO do something different here
export const resources = {
    expens: expensiveServer,
}
