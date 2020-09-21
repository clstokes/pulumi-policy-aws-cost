import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";

import { BASE_TAGS, } from "./config";

const projectName = pulumi.getProject();

const expensiveServer = new gcp.compute.Instance("expensive", {
    zone: gcp.compute.getZones().then(it => it.names[0]),
    bootDisk: {
        initializeParams: {
            image: "ubuntu-os-cloud/ubuntu-1804-lts",
        },
    },
    machineType: "n1-standard-32",
    metadata: {
        ...BASE_TAGS,
        Name: `${projectName}-server`,
    },
    networkInterfaces: [{
        accessConfigs: [{}],
    }],
});

// TODO do something different here
export const resources = {
    expens: expensiveServer,
}
