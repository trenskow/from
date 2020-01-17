'use strict';

const 
	merge = require('merge'),
	keyd = require('keyd');

module.exports = exports = function from(obj) {
	
	if (!(this instanceof from)) return new from(obj);

	if (typeof(obj) !== 'object') throw TypeError('Input must be object or array.');

	this.wasArray = Array.isArray(obj);
	this.obj = this.wasArray ? obj : [obj];

	this._valueOf = (result) => {
		return {
			value:  () => {
				if (!this.wasArray) return result[0];
				return result;
			},
			mapKeys: (keyTransform) => {
				return this._valueOf(result.map((obj) => {
					let newObj = {};
					Object.keys(obj).forEach((key) => {
						let targetKey = key;
						if (keyTransform) targetKey = keyTransform.call(targetKey, targetKey);
						newObj[targetKey] = obj[key];
					});
					return newObj;
				}));
			},
			applyTo: (obj, idx = 0) => {
				Object.keys(result[idx]).forEach((key) => {
					obj[key] = result[idx][key];
				});
				return obj;
			}
		};
	};
	
	return merge(this._valueOf(this.obj), {
		select: (fields) => {
			if (!Array.isArray(fields)) fields = fields.split(/, ?/);
			let result = this.obj.map((item) => {
				let obj = {};
				fields.forEach((field) => {
					obj[field] = keyd(item).get(field);
				});
				return obj;
			});
			return merge(this._valueOf(result), {
				where: (filter) => {
					result = result.filter(filter);
					return this._valueOf(result);
				}
			});
		}
	});

};