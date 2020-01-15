# Building Grafana Fork .tar.gz bundle

First, build or obtain the base image `grafana-fork-base`, replacing `GRAFANA-VERSION` with the latest version of Grafana. This allows for faster builds of just the delta,  lets us lock in the specific version of Grafana we want to use, and in doing so, avoid unexpected merge conflicts during the build process.

```sh
docker build --no-cache -f base.dockerfile -t grafana-fork-base:GRAFANA-VERSION .
```

Next, build the fork, incrementing `VERSION` as needed.

```sh
docker build --no-cache -t grafana-fork:VERSION .
```

----

The .tar.gz bundle is inside the container. To retrieve it, open a new shell and run the container you just built.

```sh
docker run --name grafana-fork -it grafana-fork:VERSION /bin/bash
```

Inside the container, change to the `dist` directory and print the name of the tarball.

```sh
cd dist
pwd
ls
```

While the docker container is running, in a second terminal, copy the tarball out of the container:

```sh
docker cp grafana-fork:/opt/src/github.com/grafana/grafana/dist/grafana-_GRAFANA_VERSION_pre.linux-amd64.tar.gz .
```

Terminate the container:

```sh
docker stop grafana-fork
docker container rm grafana-fork
```
