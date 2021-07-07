FROM node:14-alpine as client

WORKDIR /home/stitch

COPY ./stitch .

RUN npm ci && npm run build_all

WORKDIR /home/apollo

# Bundle app source
COPY ./apollo .
RUN npm ci && npm run cp
RUN npm run build

FROM node:14-alpine as server

ARG CONSOLE_TAG
ARG BUILD_ID
ARG BUILD_DATE

LABEL name="Fabric Operations Console" \
	io.k8s.display-name="Fabric Operations Console" \
	summary="Image for Fabric Operations Console." \
	description="Image for Fabric Operations Console." \
	io.k8s.description="Image for Fabric Operations Console." \
	console_version=$CONSOLE_TAG \
	release=$BUILD_ID \
	build-date=$BUILD_DATE \
	io.openshift.tags="blockchain"

ENV STITCH_DIR=/home/stitch
ENV APOLLO_DIR=/home/apollo
ENV SERVER_HOME=/home/athena

EXPOSE 3000

COPY --chown=1000:0 ./athena $SERVER_HOME
WORKDIR $SERVER_HOME

USER 0
RUN npm ci \
	# Make sure we can see what packages are getting installed
	&& npm ls --production > npm_ls_prod.txt

# Copy Apollo and Stitch builds
COPY --chown=1000:0 --from=client $APOLLO_DIR/build $APOLLO_DIR/build
COPY --chown=1000:0 --from=client $STITCH_DIR/dist $STITCH_DIR/dist

ADD ./athena/licenses/*.tar /licenses
RUN chown -R 1000:0 /home /licenses
USER 1000

RUN chmod -R 777 ./logs

CMD [ "npm", "start" ]
