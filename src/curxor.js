'use strict';

var Utils = require( './utils.js' ),
	Emitter = require( './emitter' ),
	Mixins = require( './mixins' ),
	Tree = require( './tree')
;

//#build
var Curxor = function( initalValue ){
	var me = this;


	// An index for quick access to the wrappers
	var elements = {};

	// Updating flag to trigger the event on nextTick
	var updating = false,
		toReturn
	;

	var tree;
	var notify = function notify( eventName, wrapper, options ){

		if( !tree.nodes[ wrapper.__id ] )
			return Utils.error( 'Can\'t udpate. The node is not in the curxor.' );

		if( eventName == 'path' )
			return tree.getPaths( wrapper );

		if( eventName == 'listener' )
			return tree.createListener( wrapper );

		// Update the tree
		var toReturn = tree.update( eventName, wrapper, options );

		// Trigger on next tick
		if( !updating ){
			updating = true;
			Utils.nextTick( function(){
				updating = false;
				me.trigger( 'update', tree );
			});
		}

		return toReturn;
	};

	// Tree will store the current structure,
	// and it is mutable. It is used to create
	// the wrapper
	tree = new Tree( initalValue, notify );

	Utils.addNE( this, {
		getData: function(){
			//console.log( tree.tree.__wrapper );
			return tree.tree.__wrapper;
		},
		setData: function( wrapper ){
			notify( 'reset', tree.tree.__wrapper, wrapper );
		}
	})

	// Create the wrapper
	this.__wrapper = tree.tree.__wrapper;

	// The event store
	this._events = [];
}

Curxor.prototype = Utils.createNonEnumerable({}, Emitter);
//#build

module.exports = Curxor;