'use strict';

module.exports = exports = function from(obj) {
	
	if (!(this instanceof from)) return new from(obj);

	if (typeof(obj) !== 'object') throw TypeError('Input must be object or array.');

	this._wasArray = Array.isArray(obj);
	this._obj = this._wasArray ? obj : [obj];

	this.mapKeys = (keyTransform) => {
		this._keyTransform = keyTransform;
		return this;
	};

	this.applyTo = (obj, idx = 0) => {
		this._applyTo = { obj, idx };
		return this.value();
	};

	this.select = (keys = []) => {
		if (!Array.isArray(keys)) keys = keys.split(/, ?/);
		this._keys = keys;
		return this;
	};

	this.filterValues = (valueTester) => {
		this._valueTester = valueTester;
		return this;
	};

	this.where = (filter) => {
		this._filter = filter;
		return this;
	};

	this.value = () => {

		let result = this._obj.map((obj, idx) => {

			let result = {};

			Object.keys(obj).forEach((key) => {

				if (this._keys && this._keys.indexOf(key) == -1) return;

				if (this._valueTester && !this._valueTester(obj[key], key)) {
					return;
				}

				let sourceKey = key;
				let destKey = key;

				if (this._keyTransform) destKey = this._keyTransform(destKey);

				if (this._applyTo && this._applyTo.idx == idx) {
					this._applyTo.obj[destKey] = obj[sourceKey];
				}

				result[destKey] = obj[sourceKey];

			});

			return result;

		});

		if (this._filter) result = result.filter(this._filter);

		if (!this._wasArray) return result[0];

		return result;

	};

	return this;

};