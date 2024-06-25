FROM registry.access.redhat.com/ubi8/nodejs-20 as client
ENV STITCH_DIR=/home/stitch
ENV APOLLO_DIR=/home/apollo

# look at the users/groups in the image...
USER 0
RUN less /etc/passwd
RUN less /etc/group



# ---------------------
# --- Build Stitch ---
# ---------------------
USER 1001
WORKDIR $STITCH_DIR
RUN pwd
COPY --chown=1001:0 ./stitch .

# change owner of repo root before npm install
# else perm errors can happen on node_modules folder depending on src perms
USER 0
RUN chown -R 1001:0 .
RUN ls -ld .
USER 1001
RUN npm ci --legacy-peer-deps --omit dev && npm run build_all

# look at stitch output...
RUN ls -l $STITCH_DIR/dist


# ---------------------
# --- Build Apollo ---
# ---------------------
USER 1001
WORKDIR $APOLLO_DIR
COPY --chown=1001:0 ./apollo .

# change owner of repo root before npm install
# else perm errors can happen on node_modules folder depending on src perms
USER 0
RUN chown -R 1001:0 .
RUN ls -ld .
USER 1001
RUN cp $STITCH_DIR/dist/* $APOLLO_DIR/public/
RUN npm ci --legacy-peer-deps --omit dev && npm run build

# look at apollo output...
RUN ls -l $APOLLO_DIR/build


# ----------------------------
# ------- Server Setup -------
# ----------------------------
FROM registry.access.redhat.com/ubi8/nodejs-20 as server
ENV STITCH_DIR=/home/stitch
ENV APOLLO_DIR=/home/apollo
ENV SERVER_HOME=/home/athena
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


# ---------------------
# --- Build Athena ----
# ---------------------
WORKDIR $SERVER_HOME
COPY --chown=1001:0 ./athena $SERVER_HOME

USER 0
RUN (dnf update -y || true)\
	&& npm ci --omit dev \
	# Make sure we can see what packages are getting installed
	&& npm ls --production > npm_ls_prod.txt \
	&& (dnf clean all -y || true)
RUN chmod -R 777 ./logs
RUN chmod -R 777 ./_backups


# -------------------------------------------------
# ------ Copy what we need from client layer ------
# -------------------------------------------------
USER 0
COPY --chown=1001:0 --from=client $APOLLO_DIR/build $APOLLO_DIR/build
COPY --chown=1001:0 --from=client $STITCH_DIR/dist $STITCH_DIR/dist
ADD ./athena/licenses/*.tar /licenses
RUN chown -R 1001:0 /home /licenses

# double check...
RUN ls -l $APOLLO_DIR/build
RUN ls -l $STITCH_DIR/dist
RUN ls -l $SERVER_HOME

# Fin
EXPOSE 3000
USER 1001
CMD [ "node", "server_watcher.js" ]
