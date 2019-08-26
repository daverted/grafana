FROM centos:6

# install curl, git, build tools
RUN yum -y update
RUN yum -y groupinstall "Development Tools"
# RUN yum install -y ruby ruby-devel rubygems-devel
RUN yum -y install readline-devel zlib-devel libyaml-devel libffi-devel openssl-devel sqlite-devel
RUN curl -sSL https://rvm.io/mpapis.asc | gpg --import -
RUN gpg2 --keyserver hkp://pool.sks-keyservers.net --recv-keys 409B6B1796C275462A1703113804BB82D39DC0E3 7D2BAF1CF37B13E2069D6956105BD0E739499BDB
RUN curl -sL get.rvm.io | bash -s stable
RUN /bin/bash -l -c "/etc/profile.d/rvm.sh; rvm reload; rvm install 2.2.4; rvm use 2.2.4 --default"

# configure git
RUN git config --global user.email "daverted@gmail.com"
RUN git config --global user.name "Dave Snyder"

WORKDIR /usr/local

# install go
RUN curl -sL https://dl.google.com/go/go1.12.9.linux-amd64.tar.gz | tar xvzf -
ENV PATH="${PATH}:/usr/local/go/bin"

# install nodejs
RUN curl -sL https://rpm.nodesource.com/setup_10.x | bash -
RUN yum install -y nodejs
RUN npm install -g yarn

WORKDIR /opt

# get official grafana
ENV GOPATH="/opt"
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