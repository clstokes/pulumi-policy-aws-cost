# pulumi-policy-aws-cost

> :information_source: This proof-of-concept currently only works Linux EC2 instances in the `us-east-1` AWS Region.

## Usage

1. This example uses the AWS Bulk API for pricing data. Currently it expects this file to already be 
downloaded. To download the pricing data for `us-east-1` run `make bootstrap`:

    ```
    % make bootstrap
    ==> Started target 'bootstrap'
    ==> Downloading EC2 offers file...
    mkdir -p resources
    curl https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json \
                    -o resources/offers-ec2-us-east-1.json
    % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                    Dload  Upload   Total   Spent    Left  Speed
    100 80.7M  100 80.7M    0     0  18.8M      0  0:00:04  0:00:04 --:--:-- 18.8M
    ==> Completed target 'bootstrap'
    ```

1. Run a `pulumi up` using the `--policy-pack` argument:

    ```
    % pulumi preview --policy-pack policy-as-code 
    Previewing update (dev):

        Type                                    Name                        Plan       Info
    +   pulumi:pulumi:Stack                     pulumi-policy-aws-cost-dev  create     2 errors; 4 messages
    +   ├─ awsx:x:ec2:Vpc                       web-vpc                     create     
    +   │  ├─ awsx:x:ec2:Subnet                 web-vpc-public-0            create     
    +   │  │  ├─ aws:ec2:RouteTable             web-vpc-public-0            create     
    +   │  │  ├─ aws:ec2:Subnet                 web-vpc-public-0            create     
    +   │  │  ├─ aws:ec2:Route                  web-vpc-public-0-ig         create     
    +   │  │  └─ aws:ec2:RouteTableAssociation  web-vpc-public-0            create     
    +   │  ├─ awsx:x:ec2:InternetGateway        web-vpc                     create     
    +   │  │  └─ aws:ec2:InternetGateway        web-vpc                     create     
    +   │  └─ aws:ec2:Vpc                       web-vpc                     create     
    +   ├─ aws:ec2:SecurityGroup                web-firewall                create     
    +   ├─ aws:ec2:Instance                     web-server-2                create     
    +   ├─ aws:ec2:Instance                     web-server-1                create     
    +   └─ aws:ec2:Instance                     web-server-0                create     
    
    Diagnostics:
    pulumi:pulumi:Stack (pulumi-policy-aws-cost-dev):
        Monthly cost of [t2.medium] is [$33.408].
        Monthly cost of [m5a.large] is [$61.92].
        Monthly cost of [g3.4xlarge] is [$820.8].
        Estimated monthly cost of [3] instances is [$916.13]
    
        mandatory: [instance-cost-estimate] Limit instance costs to $500.
        Estimated monthly cost [$916.13] exceeds [$500.00].
        error: preview failed
    
    Permalink: https://app.pulumi.com/clstokes/pulumi-policy-aws-cost/dev/previews/6a1e3273-7803-45ca-a936-4cb7d265be74
    ```
