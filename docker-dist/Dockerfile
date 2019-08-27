FROM grafana-fork-base

# go get throws a warning that's safe to ignore. exit 0 to allow docker to continue
RUN go get github.com/grafana/grafana; exit 0

# switch to forked grafana
WORKDIR /opt/src/github.com/grafana/grafana
RUN git remote set-url origin https://github.com/daverted/grafana
RUN git fetch; git pull

# build grafana
RUN go run build.go setup
RUN go run build.go build
RUN yarn cache clean; yarn install --pure-lockfile
RUN /bin/bash -l -c "/etc/profile.d/rvm.sh; gem install fpm"
RUN /bin/bash -l -c "/etc/profile.d/rvm.sh; go run build.go build package"

CMD [ "echo 'docker cp container:src_path dest_path'" ]

### copy the dist file out with:
### docker cp container:src_path dest_path