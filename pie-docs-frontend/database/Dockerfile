FROM postgres:16-alpine

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
    build-base \
    git \
    clang15 \
    llvm15

# Install pgvector
RUN git clone --branch v0.7.4 https://github.com/pgvector/pgvector.git /tmp/pgvector && \
    cd /tmp/pgvector && \
    make && \
    make install && \
    cd / && \
    rm -rf /tmp/pgvector

# Cleanup build dependencies
RUN apk del .build-deps

# Copy initialization scripts
COPY init-scripts/ /docker-entrypoint-initdb.d/
