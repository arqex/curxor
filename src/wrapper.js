'use strict';

var Utils = require( './utils.js' );

//#build
var Wrapper = function( id, value, notify ){
	this.__addNE( '__id', id );
	this.__addNE( '__val', value );
	this.__addNE( '__notify', notify);
};

Wrapper.prototype = Utils.createNonEnumerable({
	val: function(){
		return this.__val;
	},
	set: function( value ){
		this.__notify( 'replace', this, value );
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
	__addNE: function( key, value ){
		Object.defineProperty( this, key, {value: value});
	}
});
//#build

module.exports = Wrapper;