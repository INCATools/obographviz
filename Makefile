all: build

install:
	npm install

%:
	npm run $*

docker-build:
	docker build -t obographviz .

docker-run:
	docker run -p 9000:8080 obographviz:latest
