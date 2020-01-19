'use strict';

const
	{ expect } = require('chai'),
	from = require('../');

describe('from', () => {
	it ('should throw an error if input is not an object', () => {
		expect(from).to.throw(TypeError);
	});
	it ('should come back with only selected keys', () => {
		expect(from({ a: 123, b: 456}).select(['a']).value()).to.not.have.property('b');
	});
	it ('should come back with only selected keys (string variant)', () => {
		expect(from({ a: 123, b: 456, c: 789}).select(['a, b']).value()).to.not.have.property('c');
	});
	it ('should come back with a filtered array', () => {
		expect(
			from([{ a: 123, b: 456 }, { a: 111, b: 222}])
				.select(['a'])
				.where(item => item.a === 111)
				.value())
			.to.have.lengthOf(1)
			.to.have.property('0')
			.to.not.have.property('b');
	});
	it ('should apply keys to another object', () => {
		let result = {};
		from({ a: 123, b: 456}).select('a, b').applyTo(result);
		expect(result).to.have.property('a').to.equal(123);
		expect(result).to.have.property('b').to.equal(456);
	});
	it ('should apply keys to another object with keys transformed', () => {
		let result = {};
		from({ a: 123, b: 456}).select('a, b').mapKeys((key) => `_${key}`).applyTo(result);
		expect(result).to.have.property('_a').to.equal(123);
		expect(result).to.have.property('_b').to.equal(456);
	});
	it ('should come back with values filtered', () => {
		let result = from({ a: 123, b: null }).filterValues((value) => value !== null).value();
		expect(result).to.not.have.property('b');
		expect(result).to.have.property('a');
	});
});
