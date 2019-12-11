SHELL = bash

RESOURCES_DIR := resources

START_TASK = @echo -e "\033[0;32m==> $(1)...\033[0m"
START_TARGET = @echo -e "\033[0;35m==> Started target '$@'\033[0m"
DONE_TARGET = @echo -e "\033[0;35m==> Completed target '$@'\033[0m"

.PHONY: bootstrap
bootstrap:
	$(call START_TARGET)
	$(call START_TASK,Downloading EC2 offers file)
	mkdir -p resources
	curl https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json \
		-o $(RESOURCES_DIR)/offers-ec2-us-east-1.json
	$(call DONE_TARGET)
