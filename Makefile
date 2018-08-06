all: build

install:
	npm install

%:
	./node_modules/.bin/gulp $*
