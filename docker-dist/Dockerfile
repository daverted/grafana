FROM grafana-fork-base:6.5.x

# merge forked version
RUN git pull https://github.com/daverted/grafana master

# build grafana
RUN go run build.go setup
RUN go run build.go build

SHELL [ "/usr/bin/scl", "enable", "devtoolset-7" ]
RUN yarn cache clean; yarn install --pure-lockfile

# yarn build is no longer correctly building the frontend after upgrading to 6.5.2
RUN yarn run themes:generate;
RUN yarn run dist

# grunt build has been commented out to prevent undoing the previous step during this build step
RUN /bin/bash -l -c "/etc/profile.d/rvm.sh; gem install fpm"
RUN /bin/bash -l -c "/etc/profile.d/rvm.sh; go run build.go build package"

# ### copy the dist file out with:
# ### docker cp container:src_path dest_path
