FROM golang:1.11-alpine3.8 as builder
#FROM ubuntu:14.04

RUN apk add --no-cache build-base curl git && \
  rm -rf /var/lib/apt/lists/*
RUN curl https://raw.githubusercontent.com/golang/dep/master/install.sh | sh

RUN mkdir -p /go/src/github.com/hyperledger/
RUN git clone https://github.com/hyperledger/fabric.git /go/src/github.com/hyperledger/fabric --branch release-1.2
RUN git clone https://github.com/gorilla/handlers.git /go/src/github.com/gorilla/handlers
RUN ls /go/src/github.com/hyperledger
COPY ./configtxlator/main.go /go/src/github.com/hyperledger/fabric/common/tools/configtxlator/main.go
RUN cd /go/src/github.com/hyperledger/fabric && go install ./common/tools/configtxlator/
RUN ls -l /go/bin/configtxlator
RUN mkdir /lib64 && ln -s /lib/libc.musl-x86_64.so.1 /lib64/ld-linux-x86-64.so.2

FROM alpine:3.8
COPY --from=builder /go/bin/configtxlator /usr/bin/configtxlator
ENTRYPOINT [ "/bin/sh", "-c", "exec /go/bin/configtxlator start --port=8083" ]
