'use strict';

var Utils = require( './utils.js' );

//#build
var Tree = function( val ){
	this.tree = this.clone( val );
};

Tree.prototype = Utils.createNonEnumerable({
	update: function( type, path, options){

		if( !this[ type ])
			throw new Error( 'Unknown update type: ' + type );

		this[ type ]( type, path, options );

		if( type == 'update' ){
			return;
		}
	},

	replace: function( type, path, value ) {
		var target = this.get( path.slice( 0, path.length - 1), true );
		target[ path[ path.length - 1] ] = this.clone( value );
	},

	add: function( type, path, values ){
		var target = this.get( path, true );
		for( var key in values )
			target[key] = this.clone( values[key] );
	},

	remove: function( type, path, keys ) {
		var target = this.get( path, true );
		for (var i = 0, l = keys.length; i<l; i++) {
			delete target[ keys[i] ];
		}
	},

	splice: function( type, path, args ){
		var target = this.get( path, true );
		target.splice.apply( target, args );
	},

	append: function( type, path, els ){
		var target = this.get( path, true );
		for (var i = 0, l = els.length; i < l; i++) {
			target.push( els[i] );
		}
	},

	prepend: function( type, path, els ){
		var target = this.get( path, true );
		for (var i = 0, l = els.length; i < l; i++) {
			target.push( els[i] );
		}
	},

	get: function( path, doCleaning ){
		var target = this.tree,
			toClean = [target],
			i = 0
		;

		while( i < path.length && target ){
			target = target[ path[i++] ];
			toClean.push( target );
		}

		if( !target )
			throw new Error( 'Path non existent: ' + path.join('.') );

		if( doCleaning ){
			for (i = 0; i < toClean.length; i++) {
				delete toClean[i].__wrapper;
			}
		}

		return target;
	},

	clone: function( val ){
		var clone;
		if( Utils.isObject( val ) ){
			clone = {};
			for( var key in val ){
				clone[ key ] = this.clone( val[ key ] );
			}
		}
		else if ( Utils.isArray( val ) ){
			clone = [];
			for (var i = 0, l = val.length; i < l; i++) {
				clone.push( this.clone( val[i] ) );
			}
		}
		else{

			// Rewrap the object to be sure we can add the __wrapper parameter
			clone = new Object( val );
		}
		return clone;
	}
});
//#build

module.exports = Tree;