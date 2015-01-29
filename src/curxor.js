'use strict';

var Utils = require( './utils.js' ),
	Emitter = require( './emitter' ),
	Mixins = require( './mixins' ),
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
	var tree = new Tree( initalValue, elements );

	// Updating flag to trigger the event on nextTick
	var updating = false,
		toReturn
	;

	var notify = function notify( eventName, wrapper, options ){

		if( !tree.nodes[ wrapper.__id ] )
			return Utils.error( 'Can\'t udpate. The node is not in the curxor.' );

		if( eventName == 'path' )
			return tree.getPaths( wrapper );

		if( eventName == 'listener' )
			return tree.createListener( wrapper );

		// Update the tree
		tree.update( eventName, wrapper, options );
		me.__wrapper = createWrapper( tree.tree, [] );

		// Trigger on next tick
		if( !updating ){
			updating = true;
			Utils.nextTick( function(){
				updating = false;
				me.trigger( 'update' );
			});
		}

		return toReturn;
	};

	var setMixins = function( w, mixin ){
		Utils.addNE( w, {
			__id: createId(),
			__notify: notify,
			set: function( attrs ){
				return this.__notify( 'replace', this, attrs );
			},
			getPaths: function( attrs ){
				return this.__notify( 'path', this );
			},
			getListener: function(){
				return this.__notify( 'listener', this );
			}
		});
		Utils.addNE( w, mixin );
	};

	var createWrapper = function( subtree, path ){
		var w, key, i, l;

		// If the subtree has a wrapper reuse it
		if( subtree && subtree.__wrapper ) {
			w = subtree.__wrapper;
		}
		else {
			if( Utils.isObject( subtree ) ){
				w = {};
				for( key in subtree )
					w[ key ] = createWrapper( subtree[key] );

				setMixins( w, Mixins.Hash );
			}
			else if( Utils.isArray( subtree ) ){
				w = [];
				for( i=0, l=subtree.length; i<l; i++ )
					w[i] = createWrapper( subtree[i] );

				setMixins( w, Mixins.List );
			}
			else {

				// Return leaf nodes as they are
				return subtree;
			}

			// Add the wrapper to the tree
			tree.addWrapper( subtree, w );

			// Freeze if possible
			if( Object.freeze )
				Object.freeze( w );
		}

		if( subtree.__toReturn ){
			toReturn = w;
			subtree.__toReturn = false;
		}

		return w;
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
	},

	setData: function( wrapper ){
		this.__wrapper.__notify( 'reset', this.__wrapper, wrapper );
	}
}, Emitter);
//#build

module.exports = Curxor;