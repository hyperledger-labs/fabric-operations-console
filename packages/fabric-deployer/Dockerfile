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
ARG ARCH
ARG GO_VER



########## Build deployer binary ##########
FROM registry.access.redhat.com/ubi8/ubi-minimal as builder
ARG ARCH
ARG GO_VER
RUN echo "GO_VER=${GO_VER}" && echo "ARCH=${ARCH}"
RUN microdnf install -y make gcc tar gzip gcc-c++ && microdnf clean all
RUN curl -sL https://go.dev/dl/go${GO_VER}.linux-${ARCH}.tar.gz | tar zxf - -C /usr/local
ENV PATH="/usr/local/go/bin:$PATH"

ADD . /go/src/github.com/hyperledger-labs/fabric-operations-console/fabric-deployer
WORKDIR /go/src/github.com/hyperledger-labs/fabric-operations-console/fabric-deployer

## use the make command to build and generate the binary
RUN make build

########## Final image ##########
FROM registry.access.redhat.com/ubi8/ubi-minimal
ARG BUILD_ID
ARG BUILD_DATE

COPY --from=builder /tmp/build/_output/bin/deployer /usr/bin/deployer


## Add the default catalog file
ADD sampleconfigs /configs
COPY docker-entrypoint.sh .
COPY start.sh /usr/bin/start.sh

RUN microdnf update \
    && microdnf install -y \
		shadow-utils \
		iputils \
	&& groupadd -g 7051 ibp-user \
	&& useradd -u 7051 -g ibp-user -s /bin/bash ibp-user \
	&& mkdir /licenses \
	&& microdnf remove shadow-utils \
	&& microdnf clean all \
	&& chown -R ibp-user:ibp-user licenses \
	&& chmod 777 /docker-entrypoint.sh /usr/bin/start.sh

ENV CONFIGPATH /configs/dev-config.yaml
ENV DBCONNECTIONSTRING ""
ENV USERNAME ""
ENV PASSWORD ""

USER ibp-user
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["sh", "-c", "start.sh"]
