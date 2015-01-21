'use strict';

var Utils = require( './utils.js' ),
	Emitter = require( './emitter' ),
	Wrapper = require( './wrapper' ),
	ArrayWrapper = require('./arrayWrapper'),
	HashWrapper = require('./hashWrapper'),
	Tree = require( './tree')
;

//#build
var Curxor = function( initalValue ){
	var me = this;

	var wIndex = 1;

	// An index for quick access to the wrappers
	var elements = {};

	// Tree will store the current structure,
	// and it is mutable. It is used to create
	// the wrapper
	var tree = new Tree( initalValue );

	// Updating flag to trigger the event on nextTick
	var updating;
	var notify = function notify( eventName, wrapper, options ){
		var path = elements[ wrapper.__id ];
		if( eventName == 'path' )
			return path;

		tree.update( eventName, path, options );
		me.__wrapper = createWrapper( tree.tree, [] );

		// Update on next tick
		if( !updating ){
			updating = true;
			Utils.nextTick( function(){
				updating = false;
				me.trigger( 'update' );
			});
		}
	};

	var createWrapper = function( subtree, path ){
		if( subtree.__wrapper )
			return subtree.__wrapper;

		var w;
		if( Utils.isObject( subtree ) ){
			w = createHashWrapper( subtree, path );
		}
		else if( Utils.isArray( subtree ) ){
			w = createArrayWrapper( subtree, path );
		}
		else {
			w = new Wrapper( createId(), subtree.valueOf(), notify );
		}

		// Add the wrapper to the tree
		subtree.__wrapper = w;

		// Freeze if possible
		if( Object.freeze )
			Object.freeze( w );

		return w;
	};

	var createHashWrapper = function( subtree, path ){
		var children = {},
			id = createId(),
			w, childPath
		;

		for( var key in subtree ){
			childPath = path.concat( key );

			if( Utils.isWrapper( subtree[key] ) )
				w = subtree[ key ];
			else
				w = createWrapper( subtree[ key ], childPath );

			children[ key ] = w;
			elements[ w.__id ] = childPath;
		}

		return new HashWrapper( id, children, notify );
	};


	var createArrayWrapper = function( subtree, path ){
		var children = [],
			id = createId(),
			w, childPath
		;

		for (var i = 0, l = subtree.length; i < l; i++) {
			childPath = path.concat( i );

			if( Utils.isWrapper( subtree[ i ] ) )
				w = subtree[ i ];
			else
				w = createWrapper( subtree[ i ], childPath );

			children.push( w );
			elements[ w._id ] = childPath;
		}

		return new ArrayWrapper( id, children, notify );
	};

	var createId = function() {
		return 'w' + wIndex++;
	};

	// Create the wrapper
	this.__wrapper = createWrapper( tree.tree, [] );

	// The event store
	this._events = [];
}

Curxor.prototype = Utils.createNonEnumerable({
	getData: function(){
		return this.__wrapper;
	}
}, Emitter);
//#build

module.exports = Curxor;