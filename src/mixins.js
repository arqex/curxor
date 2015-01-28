'use strict';

var Utils = require( './utils.js' );

//#build
var Mixins = {

Hash: {
	remove: function( keys ){
		var filtered = [],
			k = keys
		;

		if( !Utils.isArray( keys ) )
			k = [ keys ];

		for( var i = 0, l = k.length; i<l; i++ ){
			if( this.hasOwnProperty( k[i] ) )
				filtered.push( k[i] );
		}

		if( filtered.length )
			this.__notify( 'remove', this, filtered );
	}
},

List: {
	push: function( el ){
		this.append( [el] );
	},

	append: function( els ){
		if( els && els.length )
			this.__notify( 'splice', this, [this.length, 0].concat( els ) );
	},

	pop: function(){
		if( !this.length )
			return undefined;

		var lastIndex = this.length -1,
			el = this[ lastIndex ]
		;

		this.__notify( 'splice', this, [lastIndex, 1] );
		return el;
	},

	unshift: function( el ){
		this.prepend( [el] );
	},

	prepend: function( els ){
		if( els && els.length )
			this.__notify( 'splice', this, [0, 0].concat( els ) );
	},

	shift: function(){
		if( !this.length )
			return undefined;

		var el = this[0];
		this.__notify( 'splice', this, [0, 1] );
		return el;
	},

	splice: function( index, toRemove, toAdd ){
		var els = this.slice( index, toRemove );
		this.__notify( 'splice', this, arguments );
		return els;
	}
}

};
//#build

module.exports = Mixins;