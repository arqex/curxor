'use strict';

var Utils = require( './utils'),
	Wrapper = require( './wrapper')
;

//#build
var ArrayWrapper = function( id, children, notify ){
	var value = [];

	for (var i = 0, l = children.length; i < l; i++) {
		this[ i ] = children[i];
		value.push( children[i].val() );
	}

	this.__addNE( '__children', children );
	Wrapper.call( this, id, value, notify );
}

ArrayWrapper.prototype = Utils.createNonEnumerable({
	push: function( el ){
		this.__notify( 'append', this, [el] );
	},

	append: function( els ){
		this.__notify( 'append', this, els );
	},

	pop: function(){
		var length = this.__children.length;
		if( !length )
			return undefined;

		var el = this._children[ length -1 ];
		this.__notify( 'pop', this );
		return el;
	},

	unshift: function( el ){
		this.__notify( 'prepend', this, [el] );
	},

	prepend: function( els ){
		this.__notify( 'prepend', this, els );
	},

	shift: function(){
		var length = this.__children.length;
		if( !length )
			return undefined;

		var el = this.__children[0];
		this.__notify( 'shift', this );
		return el;
	},

	splice: function( index, toRemove, toAdd ){
		var els = this.__children.slice( index, toRemove );
		this.__notify( 'splice', this, arguments );
		return els;
	},

	size: function(){
		return this.__children.length;
	},

	forEach: function( clbk ){
		return this.__children.forEach( ckbk );
	},

	map: function( clbk ){
		return this.__children.map( clbk );
	},

	filter: function( clbk ){
		return this.__children.filter( clbk );
	},

	indexOf: function( el ){
		return this.__children.indexOf( el );
	}

}, Wrapper.prototype);
//#build

module.exports = ArrayWrapper;