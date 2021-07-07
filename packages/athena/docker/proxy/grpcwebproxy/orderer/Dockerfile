FROM golang:alpine

ARG VERSION=0.6.4

RUN apk add --no-cache curl git ca-certificates && \
  rm -rf /var/lib/apt/lists/*

RUN curl https://raw.githubusercontent.com/golang/dep/master/install.sh | sh
RUN git clone https://github.com/dshuffma-ibm/grpc-web.git /go/src/github.com/dshuffma-ibm/grpc-web
RUN cd /go/src/github.com/dshuffma-ibm/grpc-web && \
  dep ensure --vendor-only && \
  go install ./go/grpcwebproxy

COPY ./proxy/grpcwebproxy/tls/localhost.crt /etc
COPY ./proxy/grpcwebproxy/tls//localhost.key /etc

#  --backend_addr=dal-zbc04b.5.secure.blockchain.ibm.com:20236 \
#  --backend_addr=n96402af17b3c42aeb2acf9b42f1b3013-orderer.stage.blockchain.ibm.com:31001 \

#ARG backend_addr=dal-zbc04b.5.secure.blockchain.ibm.com:20236
#ENV backend_addr=${backend_addr}
#--backend_addr=$backend_addr \

ENTRYPOINT [ "/bin/sh", "-c", "/go/bin/grpcwebproxy \
  --backend_addr=dal-zbc04b.5.secure.blockchain.ibm.com:20236 \
  --server_tls_cert_file=/etc/localhost.crt \
  --server_tls_key_file=/etc/localhost.key \
  --server_bind_address=0.0.0.0 \
  --server_http_debug_port=8081 \
  --server_http_tls_port=8444\
  --backend_tls=true \
  --server_http_max_write_timeout 5m \
  --server_http_max_read_timeout 5m \
  --use_websockets=true " ]
