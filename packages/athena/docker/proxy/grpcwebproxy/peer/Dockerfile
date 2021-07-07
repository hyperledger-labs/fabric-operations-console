FROM golang:alpine

RUN apk add --no-cache curl git ca-certificates && \
  rm -rf /var/lib/apt/lists/*

RUN curl https://raw.githubusercontent.com/golang/dep/master/install.sh | sh
#ARG VERSION=0.6.4
#RUN wget https://github.com/dshuffma-ibm/grpc-web/archive/$VERSION.tar.gz
#RUN mkdir -p /go/src/github.com/dshuffma-ibm/
#RUN tar -zxvf $VERSION.tar.gz -C /go/src/github.com/dshuffma-ibm/
#RUN cd /go/src/github.com/dshuffma-ibm && mv grpc-web-$VERSION grpc-web
RUN git clone https://github.com/dshuffma-ibm/grpc-web.git /go/src/github.com/dshuffma-ibm/grpc-web
RUN cd /go/src/github.com/dshuffma-ibm/grpc-web && \
  dep ensure --vendor-only && \
  go install ./go/grpcwebproxy

COPY ./proxy/grpcwebproxy/tls/localhost.crt /etc
COPY ./proxy/grpcwebproxy/tls//localhost.key /etc

ENTRYPOINT [ "/bin/sh", "-c", "exec /go/bin/grpcwebproxy \
  --backend_addr=n3a3ec3-peer6e84d6.ibpv2-test-cluster.us-south.containers.appdomain.cloud:7051 \
  --server_tls_cert_file=/etc/localhost.crt \
  --server_tls_key_file=/etc/localhost.key \
  --server_bind_address=0.0.0.0 \
  --server_http_debug_port=8080 \
  --server_http_tls_port=8443\
  --backend_tls=true \
  --server_http_max_write_timeout 5m \
  --server_http_max_read_timeout 5m \
  --use_websockets=true " ]
