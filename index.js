'use strict';

module.exports = exports = function from(obj) {
	
	if (!(this instanceof from)) return new from(obj);

	if (typeof(obj) !== 'object') throw TypeError('Input must be object or array.');

	this._wasArray = Array.isArray(obj);
	this._data = this._wasArray ? obj : [obj];

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

				if (this._keys || this._valueTester || this._keyTransform) {

					result = {};

					Object.keys(obj).forEach((key) => {

						if (this._keys && this._keys.indexOf(key) == -1) return;
	
						if (this._valueTester && !this._valueTester(obj[key], key)) {
							return;
						}
	
						let sourceKey = key;
						let destKey = key;
	
						if (this._keyTransform) destKey = this._keyTransform(destKey);
	
						result[destKey] = obj[sourceKey];
	
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