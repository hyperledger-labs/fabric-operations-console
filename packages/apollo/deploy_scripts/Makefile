#########################################################################################
# Modify this and commit when we want to start building a new IBP on Software version
#########################################################################################
IBP_VER ?= 2.0.0-apollo-testing # todo set this to something real
#########################################################################################
# ^ Modify this and commit when we want to start building a new IBP on Software version
#########################################################################################

login-pull: guard-DOCKER_SRC_REGISTRY guard-DOCKER_SRC_USERNAME guard-DOCKER_SRC_REGISTRY_TOKEN
	docker login $(DOCKER_SRC_REGISTRY) --username $(DOCKER_SRC_USERNAME) --password $(DOCKER_SRC_REGISTRY_TOKEN)

login-push: guard-DOCKER_PUSH_REGISTRY guard-US_ICR_IO_USERNAME guard-US_ICR_IO_USERNAME
	docker login $(DOCKER_PUSH_REGISTRY) --username $(US_ICR_IO_USERNAME) --password $(US_ICR_IO_PASSWORD)

TRAVIS_BUILD_DIR ?= ..
IMAGE_BUILD_NAME = apollo-test:latest

# Info about the build is saved in tags on the docker image
COMMIT ?= $(shell git rev-parse --short HEAD)
GIT_TAG ?= $(shell git describe | grep -v -)
ARCH ?= amd64
NODE_VER ?= 12.18.3
BUILD_DATE = $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LICENSE_HARDCODE ?= 'false'

BUILD_ARGS=--build-arg ARCH=$(ARCH)
BUILD_ARGS+=--build-arg REGISTRY=$(DOCKER_SRC_REGISTRY)
BUILD_ARGS+=--build-arg NODE_VER=$(NODE_VER)
BUILD_ARGS+=--build-arg BUILD_ID=$(COMMIT)
BUILD_ARGS+=--build-arg IBP_VER=$(IBP_VER)
BUILD_ARGS+=--build-arg BUILD_DATE=$(BUILD_DATE)
BUILD_ARGS+=--build-arg CONSOLE_TAG=$(GIT_TAG)
BUILD_ARGS+=--build-arg LICENSE_HARDCODE=$(LICENSE_HARDCODE)

ATHENA_DIR=/home/travis/build/IBM-Blockchain/athena

image: login-pull guard-IMAGE_COMMIT_NAME
	docker build \
		--force-rm \
		-t $(IMAGE_BUILD_NAME) \
		$(BUILD_ARGS) \
		--pull -f $(ATHENA_DIR)/docker/Dockerfile $(ATHENA_DIR)/.
	docker tag $(IMAGE_BUILD_NAME) $(IMAGE_COMMIT_NAME)
	if [ ! -z "$(IMAGE_VERSIONED_NAME)" ]; then \
		docker tag $(IMAGE_BUILD_NAME) $(IMAGE_VERSIONED_NAME); \
	fi

push: login-push guard-IMAGE_COMMIT_NAME
	docker push $(IMAGE_COMMIT_NAME)
	if [ ! -z "$(IMAGE_VERSIONED_NAME)" ]; then \
		docker push $(IMAGE_VERSIONED_NAME); \
	fi
	docker image ls

all: image push

clean:
	@echo Cleaning docker
	$(eval DOCKER_IMAGES = $(shell docker images --quiet --filter=reference='$(IMAGE_BUILD_NAME)'))
	[ -n "$(DOCKER_IMAGES)" ] && docker rmi -f $(DOCKER_IMAGES) || true

guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi

PHONY: image push all clean
