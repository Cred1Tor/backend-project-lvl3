test:
	npm test

run:
	node src/bin/cli.js --output=.. http://starbuzzcoffee.com

test-coverage:
	npm test -- --coverage

lint:
	npx eslint .

publish:
	npm publish

.PHONY: test
