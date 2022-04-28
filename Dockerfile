FROM denoland/deno:latest as base

# Install OpenJDK-8
RUN apt-get update && \
    apt-get install -y openjdk-17-jdk && \
    apt-get install -y ant && \
    apt-get install ca-certificates-java && \
    update-ca-certificates -f && \
    apt-get -y install --no-install-recommends wget && \
    apt-get -y autoremove && \
    apt-get -y clean && \
    rm -rf /var/lib/apt/lists/*

RUN apt-get update && \
    apt-get install -y locales locales-all
ENV LC_ALL en_US.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8

# Setup JAVA_HOME -- useful for docker commandline
ENV JAVA_HOME /usr/lib/jvm/java-17-openjdk-amd64/
RUN export JAVA_HOME

WORKDIR /signal-cli

RUN wget -qO- "https://api.github.com/repos/AsamK/signal-cli/releases/latest" \
    | grep browser_download_url \
    | grep tar.gz\" \
    | cut -d '"' -f 4 \
    | wget -qi - -O signal-cli.tar.gz \
    && tar zxvpf signal-cli.tar.gz --strip 1 \
    && rm signal-cli.tar.gz

WORKDIR /signal-cli-api

COPY . .

EXPOSE 8080

ENTRYPOINT [ "deno" ]
CMD ["run", "--allow-net", "--allow-run", "server.ts", "8080"]


