'use strict';

var Utils = require( './utils.js' );

//#build
var Wrapper = function( id, value, notify ){
	this.__addNE( '__id', id );

	// If it is a leaf, its real value lives in __leafVal
	// See tree.js
	this.__addNE( '__val', typeof value.__leafVal != 'undefined' ? value.__leafVal : value );
	this.__addNE( '__notify', notify);
};

Wrapper.prototype = Utils.createNonEnumerable({
	val: function(){
		return this.__val;
	},
	set: function( attrs ){
		this.__notify( 'replace', this, attrs );
	},
	remove: function(){
		this.__notify( 'remove', this );
	},
	toString: function(){
		return this.__val.toString();
	},
	valueOf: function(){
		return this.__val.valueOf();
	},
	getPath: function(){
		return this.__notify( 'path', this );
	},
	getListener: function(){
		return this.__notify( 'listener', this );
	},
	__addNE: function( key, value ){
		Object.defineProperty( this, key, {value: value});
	}
});
//#build

module.exports = Wrapper;