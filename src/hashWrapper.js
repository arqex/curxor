'use strict';

var Utils = require( './utils'),
	Wrapper = require( './wrapper')
;

//#build
var HashWrapper = function( id, children, notify ){
	var value = {};

	for( var key in children ){
		this[ key ] = children[key];
		value[ key ] = children[key].val();
	}

	this.__addNE( '__children', children );
	Wrapper.call( this, id, value, notify );
}

HashWrapper.prototype = Utils.createNonEnumerable({
	add: function( hashOrKey, value ){

		if( Utils.isObject( hashOrKey ) ){
			return this.__notify( 'add', this, hashOrKey );
		}

		var update = {};
		update[ hashOrKey ] = value;
		this.__notify( 'add', this, update );
	},
	remove: function( keys ){
		var k = keys;
		if( !Utils.isArray( k ) )
			k = [k];

		for(var i=0,l=k.length; i<l; i++){
			if( this.hasOwnProperty( k[i] ) )
				this.__notify( 'remove', this, key );
		}
	}
}, Wrapper.prototype);
//#build

module.exports = HashWrapper;