import * as aws from "@pulumi/aws";

export const amiId = aws.getAmi({
    owners: ["099720109477"], // Ubuntu
    mostRecent: true,
    filters: [
        // { name: "name", values: ["ubuntu/images/hvm-ssd/ubuntu-xenial-16.04-amd64-server-*"] },
        { name: "name", values: ["ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-amd64-server-*"] },
    ],
}).then(x => x.id);
