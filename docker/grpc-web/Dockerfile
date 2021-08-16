FROM golang:1.14-alpine as builder

RUN apk update && apk add --no-cache alpine-sdk bash curl git ca-certificates openssl musl-dev && \
	rm -rf /var/lib/apt/lists/*

# RUN apt install -y \
# 	openssl

RUN go get -u github.com/golang/dep/cmd/dep
RUN git clone https://github.com/improbable-eng/grpc-web.git /go/src/github.com/improbable-eng/grpc-web

RUN cd /go/src/github.com/improbable-eng/grpc-web/go/grpcwebproxy && \
	go build

RUN cd /go/src/github.com/improbable-eng/grpc-web/misc && ./gen_cert.sh

FROM golang:1.14-alpine

COPY --from=builder /go/src/github.com/improbable-eng/grpc-web/go/grpcwebproxy/grpcwebproxy /usr/bin/grpcwebproxy
COPY --from=builder /go/src/github.com/improbable-eng/grpc-web/misc/localhost.crt /certs/localhost.crt
COPY --from=builder /go/src/github.com/improbable-eng/grpc-web/misc/localhost.key /certs/localhost.key

# Default env variables
ENV BACKEND_ADDRESS "127.0.0.1:7051"
ENV SERVER_TLS_CERT_FILE "/certs/localhost.crt"
ENV SERVER_TLS_KEY_FILE "/certs/localhost.key"
ENV SERVER_BIND_ADDRESS "0.0.0.0"
ENV SERVER_HTTP_DEBUG_PORT "8080"
ENV SERVER_HTTP_TLS_PORT "8443"
ENV BACKEND_TLS "true"
ENV RUN_TLS_SERVER "true"
ENV SERVER_HTTP_MAX_WRITE_TIMEOUT "5m"
ENV SERVER_HTTP_MAX_READ_TIMEOUT "5m"
ENV USE_WEBSOCKETS "true"
ENV BACKEND_TLS_NO_VERIFY "true"
ENV SERVER_TLS_CLIENT_CA_FILES ""
ENV BACKEND_TLS_CA_FILES ""
ENV ALLOW_ALL_ORIGINS "true"
ENV BACKEND_CLIENT_TLS_CERT_FILE ""
ENV BACKEND_CLIENT_TLS_KEY_FILE ""

EXPOSE 8080 9443

CMD ["sh", "-c", "/usr/bin/grpcwebproxy \
--backend_addr=\"${BACKEND_ADDRESS}\" \
--server_tls_cert_file=\"${SERVER_TLS_CERT_FILE}\" \
--server_tls_key_file=\"${SERVER_TLS_KEY_FILE}\" \
--server_tls_client_ca_files=\"${SERVER_TLS_CLIENT_CA_FILES}\" \
--backend_tls_ca_files=\"${BACKEND_TLS_CA_FILES}\" \
--server_bind_address=\"${SERVER_BIND_ADDRESS}\" \
--server_http_debug_port=\"${SERVER_HTTP_DEBUG_PORT}\" \
--server_http_tls_port=\"${SERVER_HTTP_TLS_PORT}\" \
--backend_tls=\"${BACKEND_TLS}\" \
--run_tls_server=\"${RUN_TLS_SERVER}\" \
--server_http_max_write_timeout=\"${SERVER_HTTP_MAX_WRITE_TIMEOUT}\" \
--server_http_max_read_timeout=\"${SERVER_HTTP_MAX_READ_TIMEOUT}\" \
--use_websockets=\"${USE_WEBSOCKETS}\" \
--backend_tls_noverify=\"${BACKEND_TLS_NO_VERIFY}\" \
--allow_all_origins=\"${ALLOW_ALL_ORIGINS}\" \
--backend_client_tls_cert_file=\"${BACKEND_CLIENT_TLS_CERT_FILE}\" \
--backend_client_tls_key_file=\"${BACKEND_CLIENT_TLS_KEY_FILE}\" " \
]
