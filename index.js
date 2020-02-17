'use strict';

const
	keyd = require('keyd');

module.exports = exports = function from(obj) {
	
	if (!(this instanceof from)) return new from(obj);

	if (typeof(obj) !== 'object') throw TypeError('Input must be object or array.');

	this._wasArray = Array.isArray(obj);
	this._data = this._wasArray ? obj : [obj];
	this._keyTransforms = [];
	this._valueTransforms = [];
	this._keyTesters = [];
	this._valueTesters = [];

	this.mapKeys = (transform) => {
		if (typeof transform === 'function') this._keyTransforms.push(transform);
		else {
			this._keyTransforms.push((key) => {
				return transform[key] || key;
			});
		}
		return this;
	};

	this.applyTo = (obj, idx = 0) => {
		this._applyTo = { obj, idx };
		return this.value();
	};

	this.select = (keyPaths = []) => {
		if (!Array.isArray(keyPaths)) keyPaths = keyPaths.split(/, ?/);
		return this.filterKeys((second) => {
			return keyPaths.some((first) => keyd.within(first, second));
		});
	};

	this.filterKeys = (keyTester) => {
		this._keyTesters.push(keyTester);
		return this;
	};

	this.filterValues = (valueTester) => {
		this._valueTesters.push(valueTester);
		return this;
	};

	this.mapValues = (transform, beforeFilter = false) => {
		this._valueTransforms.push({
			transform,
			beforeFilter
		});
		return this;
	};

	this._deductConditions = (conditions) => {
		if (!conditions) throw new TypeError('Conditions must be provided.');
		if (Array.isArray(conditions)) {
			return conditions.map((conditions) => {
				return this._deductConditions(conditions);
			});
		} else {
			if (typeof conditions !== 'object') throw new TypeError('Conditions must be an object.');
			return Object.keys(conditions).map((key) => {
				let obj = {};
				if (conditions[key] == null) {
					obj[key] = null;
				} else if (typeof conditions[key] === 'object' && !(conditions[key] instanceof Date)) {
					obj[key] = this._deductConditions(conditions[key]);
				} else {
					obj[key] = conditions[key];
				}
				return obj;
			});
		}
	};

	this.where = (conditions) => {
		if (typeof conditions === 'function') {
			this._filter = conditions;
			return this;
		}
		this._conditions = this._deductConditions(conditions);
		return this;
	};

	this.offsetBy = (offset) => {
		this._offset = offset;
		return this;
	};

	this.limitTo = (limit) => {
		this._limit = limit;
		return this;
	};

	this.paginated = (options) => {
		this.offsetBy(options.offset);
		this.limitTo(options.limit || options.count);
		return this;
	};

	this._test = (value, conditions, operator = '$and', comparer = '$eq') => {

		const operators = ['$and','$or'];
		const comparers = ['$eq','$ne','$gt','$gte','$lt','$lte','$regexp'];

		const result = conditions.map((condition) => {
			const key = Object.keys(condition)[0];
			if (key.substr(0, 1) === '$') {
				if (operators.indexOf(key) > -1) return this._test(value, condition[key], key, comparer);
				if (comparers.indexOf(key) > -1) return this._test(value, condition[key], operator, key);
				throw new TypeError(`Operator ${key} is not supported.`);
			}
			switch (comparer) {
			case '$eq':
				if (!condition[key]) return value[key] == condition[key];
				return value[key] === condition[key];
			case '$ne':
				if (!condition[key]) return value[key] != condition[key];
				return value[key] !== condition[key];
			case '$gt':
				return value[key] > condition[key];
			case '$gte':
				return value[key] >= condition[key];
			case '$lt':
				return value[key] < condition[key];
			case '$lte':
				return value[key] <= condition[key];
			case '$regexp': {
				let regexp = condition[key];
				if (!value[key]) return false;
				if (typeof regexp === 'string') regexp = new RegExp(regexp);
				return regexp.test(value[key]);
			}
			}
		});

		switch (operator) {
		case '$and':
			return !result.some((result) => !result);
		case '$or':
			return result.some((result) => result);
		}

		throw TypeError(`Operator ${operator} not supported`);

	};

	this._transformValues = (value, keyPath, beforeFilter) => {
		return this._valueTransforms
			.filter((valueTransform) => valueTransform.beforeFilter === beforeFilter)
			.reduce((value, valueTransform) => {
				return valueTransform.transform(value, keyPath);
			}, value);
	};

	this.value = (opt = {}) => {

		if (opt == null || typeof opt !== 'object') throw new TypeError('Options must be an object.');

		let data = this._data;

		if (this._offset || this._limit) {
			if (this._limit) data = data.slice(this._offset || 0, (this._offset || 0) + this._limit);
			else data = data.slice(this._offset);
		}

		const result = data
			.filter((obj, ...args) => {	
				const filter = (this._filter ? this._filter(obj, ...args) : true);
				const conditions = (this._conditions ? this._test(obj, this._conditions) : true);
				return filter && conditions;
			})
			.map((obj, idx) => {

				let result = obj;

				if (this._keyTesters.length || this._valueTesters.length || this._keyTransforms.length || this._valueTransforms.length) {

					result = {};

					const keyPaths = keyd(obj).keyPaths();

					keyPaths.forEach((keyPath) => {

						if (keyPaths.some((second) => {
							return keyPath !== second && keyd.within(keyPath, second);
						})) return;

						if (this._keyTesters.some((keyTester) => {
							return !keyTester(keyPath);
						})) return;

						let value = keyd(obj).get(keyPath);

						value = this._transformValues(value, keyPath, true);

						if (this._valueTesters.some((valueTester) => {
							return !valueTester(value);
						})) return;

						value = this._transformValues(value, keyPath, false);

						keyPath = this._keyTransforms.reduce((keyPath, keyTransform) => {
							return keyTransform(keyPath);
						}, keyPath);

						keyd(result).set(keyPath, value);

					});
	
				}

				if (this._applyTo) {
					Object.keys(result).forEach((key) => {
						if (this._applyTo && this._applyTo.idx == idx) {
							this._applyTo.obj[key] = result[key];
						}
					});
				}

				return result;

			});

		if (!this._wasArray || opt.first) return result[0];

		return result;

	};

	this.first = () => {
		return this.value({ first: true });
	};

	return this;

};