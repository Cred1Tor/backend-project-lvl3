install: install-deps

run:
	src/bin/cli.js --output=.. http://starbuzzcoffee.com

install-deps:
	npm ci

test:
	npm test

test-coverage:
	npm test -- --coverage --coverageProvider=v8

lint:
	npx eslint .

publish:
	npm publish

.PHONY: test
