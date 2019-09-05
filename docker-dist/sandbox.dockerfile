FROM grafana-fork-base:6.3.5

# switch to forked grafana
WORKDIR /opt/src/github.com/grafana/grafana
RUN git remote set-url origin https://github.com/daverted/grafana
RUN git fetch
RUN git checkout ds/nav-panels

# build grafana
RUN go run build.go setup
RUN go run build.go build

SHELL [ "/usr/bin/scl", "enable", "devtoolset-7" ]
RUN yarn cache clean; yarn install --pure-lockfile

RUN /bin/bash -l -c "/etc/profile.d/rvm.sh; gem install fpm"
RUN /bin/bash -l -c "/etc/profile.d/rvm.sh; go run build.go build package"

CMD [ "echo 'docker cp container:src_path dest_path'" ]

## copy the dist file out with:
## docker cp container:src_path dest_path