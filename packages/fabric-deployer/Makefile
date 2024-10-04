#
# Copyright contributors to the Hyperledger Fabric Operations Console project
#
# SPDX-License-Identifier: Apache-2.0
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at:
#
# 	  http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#

IMAGE ?= ghcr.io/ibm-blockchain/fabric-deployer
TAG ?= $(shell git rev-parse --short HEAD)
PULL ?= $(TRAVIS_PULL_REQUEST)
ARCH ?= $(shell go env GOARCH)
BRANCH ?= $(shell git branch --show-current)
GO_VER ?= 1.23.1
BUILD_ID = $(shell git rev-parse --short HEAD)
BUILD_DATE = $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

DOCKER_IMAGE_REPO ?= us.icr.io

BUILD_ARGS=--build-arg ARCH=$(ARCH)
BUILD_ARGS+=--build-arg BUILD_ID=$(BUILD_ID)
BUILD_ARGS+=--build-arg BUILD_DATE=$(BUILD_DATE)
BUILD_ARGS+=--build-arg GO_VER=$(GO_VER)

# LOGGING
LOG_MSG=$(shell command -v figlet 2> /dev/null)
ifeq ($(LOG_MSG),)
LOG_MSG=echo
endif

ifneq ($(origin TRAVIS_PULL_REQUEST),undefined)
	ifneq ($(TRAVIS_PULL_REQUEST), false)
		TAG=pr-$(TRAVIS_PULL_REQUEST)
	endif
endif


# Color printing of output
PRINT_BLUE=awk '{ print "\033[1;34m" $$0 "\033[1;0m" }'

.PHONY: build

build: ## Builds the starter pack
	@$(LOG_MSG) Building binary ... | $(PRINT_BLUE)
	go build -o /tmp/build/_output/bin/deployer github.com/IBM-Blockchain/fabric-deployer

# Run go fmt against code
fmt:
	go fmt ./...

# Run go vet against code
vet:
	@scripts/checks.sh

test: fmt vet ## Runs unit tests
	@$(LOG_MSG) Running unit tests ... | $(PRINT_BLUE)
	@scripts/run_unit_test.sh

image: ## Builds a x86 based image
	@$(LOG_MSG) Building docker image ... | $(PRINT_BLUE)
	# need to run go mod vendor here as the travis worker has the keys to pull modules
	# from github.com but the docker container that builds the image doesnt. We get
	# the modules on the machine first, before building the image so there is no need
	# for go get inside the builder container.
	@go mod vendor
	docker build --rm . -f ./Dockerfile $(BUILD_ARGS) -t "$(IMAGE):$(TAG)-$(ARCH)"
	docker tag $(IMAGE):$(TAG)-$(ARCH) $(IMAGE):latest-$(ARCH)


image-push: ## Pushes the image
	@$(LOG_MSG) Pushing image '$(IMAGE):$(TAG)' ... | $(PRINT_BLUE)
	docker push $(IMAGE):$(TAG)-$(ARCH)

image-push-latest:
	@$(LOG_MSG) Pushing image '$(IMAGE):latest' ... | $(PRINT_BLUE)
	docker push $(IMAGE):latest-$(ARCH)

build-push: image push ## Builds and pushes the image

.PHONY: license
license:
	@scripts/check-license.sh

gosec:
	@scripts/go-sec.sh

docker: image

clean-docker:
	@$(LOG_MSG) Cleaning docker ... | $(PRINT_BLUE)
	$(eval DOCKER_IMAGES = $(shell docker images --quiet --filter=reference='$(IMAGE)'))
	[ -n "$(DOCKER_IMAGES)" ] && docker rmi -f $(DOCKER_IMAGES) || true

help: ## Shows the help
	@echo 'Usage: make <OPTIONS> ... <TARGETS>'
	@echo ''
	@echo 'Available targets are:'
	@echo ''
	@grep -E '^[ a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
        awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
	@echo ''

.PHONY: build test image clean help
