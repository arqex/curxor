/* curxor v0.1.2 (28-1-2015)
 * https://github.com/arqex/curxor
 * By arqex
 * License: BSD-2-Clause
 */
(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof exports === 'object') {
		module.exports = factory();
	} else {
		root.Curxor = factory();
	}
}(this, function() {
	'use strict';
	
var global = (new Function("return this")());

var Utils = {
	isObject: function( value ){
		return value && value.constructor == Object;
	},

	isArray: function( value ){
		return value && value.constructor == Array;
	},

	isWrapper: function( value ){
		return value && value.__notify;
	},

	createNonEnumerable: function( obj, proto ){
		var ne = {};
		for( var key in obj )
			ne[key] = {value: obj[key] };
		return Object.create( proto || {}, ne );
	},

	error: function( message ){
		var err = new Error( message );
		if( console )
			return console.error( err );
		else
			throw err;
	},

	clone: function( o ){
		if( this.isArray( o ) )
			return o.slice( 0 );

		if( this.isObject( o ) ){
			var clone = {};
			for( var key in o )
				clone[ key ] = o[ key ];
			return clone;
		}

		return o;
	},

	addNE: function( node, attr, value ){
		var attrs = attr;

		if( typeof value != 'undefined' ){
			attrs = {};
			attrs[ attr ] = value;
		}

		for( var key in attrs ){
			Object.defineProperty( node, key, {
				enumerable: false,
				configurable: true,
				writable: true,
				value: attrs[ key ]
			});
		}
	},

	// nextTick - by stagas / public domain
  	nextTick: (function () {
      var queue = [],
			dirty = false,
			fn,

			// Thanks to setImmediate for hasPostMessage,
			// postMessage in IE8 is sync.
			hasPostMessage = (function(){
				if( !global.postMessage ) return false;

				var async = true;
				var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                async = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;

            return async;
			})(),
			messageName = 'nexttick',
			trigger = (function () {
				return hasPostMessage
					? function trigger () {
					global.postMessage(messageName, '*');
				}
				: function trigger () {
					setTimeout(function () { processQueue() }, 0);
				};
			}()),
			processQueue = (function () {
				return hasPostMessage
					? function processQueue (event) {
						if (event.source === global && event.data === messageName) {
							event.stopPropagation();
							flushQueue();
						}
					}
					: flushQueue;
      	})()
      ;

      function flushQueue () {
          while (fn = queue.shift()) {
              fn();
          }
          dirty = false;
      }

      function nextTick (fn) {
          queue.push(fn);
          if (dirty) return;
          dirty = true;
          trigger();
      }

      if (hasPostMessage) global.addEventListener('message', processQueue, true);

      nextTick.removeListener = function () {
          global.removeEventListener('message', processQueue, true);
      }

      return nextTick;
  })()
};


// The prototype methods are stored in a different object
// and applied as non enumerable properties later
var emitterProto = {
	on: function( eventName, listener, once ){
		var listeners = this._events[ eventName ] || [];

		listeners.push({ callback: listener, once: once});
		this._events[ eventName ] =  listeners;

		return this;
	},

	once: function( eventName, listener ){
		this.on( eventName, listener, true );
	},

	off: function( eventName, listener ){
		if( typeof eventName == 'undefined' ){
			this._events = {};
		}
		else if( typeof listener == 'undefined' ) {
			this._events[ eventName ] = [];
		}
		else {
			var listeners = this._events[ eventName ] || [],
				i
			;

			for (i = listeners.length - 1; i >= 0; i--) {
				if( listeners[i] === listener )
					listeners.splice( i, 1 );
			}
		}

		return this;
	},

	trigger: function( eventName ){
		var args = [].slice.call( arguments, 1 ),
			listeners = this._events[ eventName ] || [],
			onceListeners = [],
			i, listener
		;

		// Call listeners
		for (i = 0; i < listeners.length; i++) {
			listener = listeners[i];

			if( listener.callback )
				listener.callback.apply( null, args );
			else {
				// If there is not a callback, remove!
				listener.once = true;
			}

			if( listener.once )
				onceListeners.push( i );
		}

		// Remove listeners marked as once
		for( i = onceListeners.length - 1; i >= 0; i-- ){
			listeners.splice( onceListeners[i], 1 );
		}

		return this;
	}
};

// Methods are not enumerable so, when the stores are
// extended with the emitter, they can be iterated as
// hashmaps
var Emitter = Utils.createNonEnumerable( emitterProto );

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

var Tree = function( val, els ){
	this.tree = this.prepare( val, [ [] ] );
	this.nodes = {};
	this.noPathNodes = {};
};

Tree.prototype = Utils.createNonEnumerable({
	reset: function( wrapper, data ){
		this.tree = this.prepare( data, [ [] ] );
	},

	update: function( type, wrapper, options){

		if( !this[ type ])
			return Utils.error( 'Unknown update type: ' + type );

		this[ type ]( wrapper, options );

		if( type == 'update' ){
			return;
		}
	},

	replace: function( wrapper, attrs ) {

		var node = this.nodes[ wrapper.__id ],
			paths = node.__paths,
			childPaths, prevNode
		;

		this.cleanPaths( paths );

		for( var key in attrs ){
			prevNode = node[ key ];
			childPaths = this.addToPaths( paths, key );
			this.removeReferences( node[ key ], childPaths, true );
			node[ key ] = this.prepare( attrs[ key ], childPaths );
			if( prevNode )
				node[ key ].__listener = prevNode.__listener;
		}
	},

	remove: function( wrapper, keys ) {
		var target = this.nodes[ wrapper.__id ],
			paths = target.__paths,
			i, l
		;

		this.cleanPaths( paths );

		for (i = 0, l = keys.length; i<l; i++) {
			this.removeReferences( target[ keys[i] ], this.addToPaths( paths, keys[i] ), true );
			delete target[ keys[i] ];
		}
	},

	splice: function( wrapper, args ){
		var target = this.nodes[ wrapper.__id ],
			paths = target.__paths,
			i,l
		;

		this.cleanPaths( paths );

		// Update the tree
		var removed = target.splice.apply( target, args );

		// Prepare new elements
		for( i = 2, l = args.length; i<l; i++ ){
			args[i] = this.prepare( args[i], this.addToPaths( paths, args[0] + i - 2 ) );
		}

		// Delete references to the removed elements
		for( i = 0, l = removed.length; i<l; i++){
			this.removeReferences( removed[i], this.addToPaths( paths, i) );
		}

		// Update references for the elements after the inserted ones
		for( i = args[0] + args.length - 2, l=target.length; i<l; i++ ){
			this.refreshReferences( target[i], paths, this.addToPaths( paths, i ) );
		}
	},

	cleanPaths: function( paths ){
		for(var i=0, l=paths.length; i<l; i++)
			this.cleanPath( paths[i] );
	},

	cleanPath: function( path ){
		this.get( path, true );
	},

	get: function( path, doCleaning ){
		var target = this.tree,
			toClean = [ target ],
			i = 0,
			node
		;

		while( i < path.length && target ){
			target = target[ path[i++] ];
			toClean.push( target );
		}

		if( !target )
			Utils.error( 'Path non existent: ' + path.join('.') );

		if( doCleaning ){
			for (i = 0; i < toClean.length; i++) {
				node = toClean[i];

				delete this.nodes[ node.__wrapper.__id ];
				node.__wrapper = false;
				node.__toUpdate = true;
			}
		}

		return target;
	},

	copy: function( tree, path, clbk ) {
		var children;
		if( Utils.isObject( tree ) ){
			children = {};
			for( var key in tree ){
				children[ key ] = this.copy( tree[ key ], path.concat( key ), clbk );
			}
		}
		else if ( Utils.isArray( tree ) ){
			children = [];
			for (var i = 0, l = tree.length; i < l; i++) {
				children.push( this.copy( tree[i], path.concat( i ), clbk ) );
			}
		}

		return clbk( tree, path, children );
	},

	prepare: function( tree, paths ){
		if( Utils.isWrapper( tree ) )
			return this.prepareWrapper( tree, paths );
		return this.clone( tree, paths );
	},

	addNodeProperties: function( tree, paths, currentPath ) {
		 Utils.addNE( tree, {
			__listener: false,
			__paths: this.addToPaths( paths, currentPath ),
			__wrapper: false,
			__toUpdate: false
		});
	},

	clone: function( tree, paths ){
		var me = this;

		return this.copy( tree, [], function( node, path, children ){

			if( !children )
				return node;

			me.addNodeProperties( children, paths, path );
			return children;

		});
	},

	prepareWrapper: function( wrapper, paths ){
		var me = this,
			topNode = this.nodes[ wrapper.__id ]
		;

		if( topNode ){
			// We are adding again an existing node, just add the new path to the old node
			this.copy( topNode, [], function( node, path, children ){
				// Update paths on non-leaves
				if( children ) {
					node.__paths = node.__paths.concat( me.addToPaths( paths, path ) );
				}
			});

			return topNode;
		}
		else {

			// try to get the topNode from the path
			topNode = this.get( paths[0] );

			// Delete paths from the nodes in the updating path,
			// but don't delete them from the @nodes attribute.
			if( topNode ){
				this.removeReferences( topNode, paths );
			}

			// Try to reuse the wrappers
			var node = this.restoreWrapper( wrapper, paths, [] );

			// Now clean the tree of nodes without paths
			if( topNode ){
				for( var key in me.noPathNodes ){
					delete me.noPathNodes[ key ];
					delete me.nodes[ key ];
				}
			}

			return node;
		}
	},

	restoreWrapper: function( wrapper, paths, path ){

		// Return leaf nodes as they are
		if( !Utils.isWrapper( wrapper ) )
			return wrapper;

		var prevNode = this.nodes[ wrapper.__id ];
		if( prevNode ) {

			// We got a new location for the node
			prevNode.__paths = prevNode.__paths.concat( this.addToPaths( paths, path ) );

			// remove the node from the list of the nodes without paths,
			// if it is there
			delete this.noPathNodes[ prevNode.__wrapper.__id ];

			return prevNode;
		}

		// No luck, we need to iterate over the children
		var children, i, l;
		if( Utils.isObject( wrapper ) ){
			children = {};
			for( i in wrapper )
				children[ i ] = this.restoreWrapper( wrapper[ i ], paths, path.concat( i ) );
		}
		else {
			children = [];
			for( i=0,l=wrapper.length; i<l; i++ )
				children.push( this.restoreWrapper( wrapper[ i ], paths, path.concat( i ) ));
		}

		this.addNodeProperties( children, paths, path );
		return children;
	},

	addToPaths: function( paths, key ){
		var added = [],
			i,l
		;

		if( !paths )
			throw new Error( 'Null' );

		for( i=0,l=paths.length;i<l;i++ ){
			added.push( paths[i].concat( key ) );
		}

		return added;
	},

	isParentPath: function( parent, child ){
		var isParent = true,
			i = 0,
			l = parent.length
		;

		if( child.length < l )
			return false;

		while( isParent && i<l ){
			isParent = parent[i] == child[ i++ ];
		}

		return isParent;
	},

	updateNodePaths: function( node, parentPaths, updatedPaths ){
		var nodePaths = node.__paths,
			updateValue,i,l,j,p
		;

		// Iterate over the parentPaths
		for( i=0,l=parentPaths.length;i<l;i++ ){
			p = parentPaths[i];

			if( updatedPaths )
				updateValue = updatedPaths[i][p.length];

			for (j = nodePaths.length - 1; j >= 0; j--) {

				// If the we got the parent of the current path
				if( this.isParentPath( p, nodePaths[j] ) ){

					// If we want to update, set the updated index of
					// the parent path in the node path
					if( updatedPaths )
						nodePaths[j][p.length] = updateValue;

					// Else we want to delete the path
					else
						nodePaths.splice( j, 1 );
				}
			}
		}
	},

	/**
	 * Deletes the keys from the element object, to destroy
	 * outdated references to wrappers.
	 *
	 * @param  {Branch} tree The part of the tree to remove the references
	 * @param {Array} paths An array of paths to delete from the tree nodes
	 * @param {boolean} alsoDelete If the node remains with 0 paths, delete it from @nodes
	 */
	removeReferences: function( tree, paths, alsoDelete ){
		var me = this;
		this.copy( tree, [], function( node, p, children ){

			if( !children )
				return;

			// Delete the paths
			me.updateNodePaths( node, paths );

			// If there are no paths delete the node
			if( !node.__paths.length ){
				if( alsoDelete )
					delete me.nodes[ node.__wrapper.__id ];
				else
					me.noPathNodes[ node.__wrapper.__id ] = node;
			}
		});
	},

	/**
	 * Refresh the paths of the children of an array subtree
	 * @param  {Branch} tree The array child to update
	 * @param  {Array} path The paths of the array updated
	 * @param {Array} updatedPaths The paths with the new key added
	 */
	refreshReferences: function( tree, parentPaths, updatedPaths ){
		var me = this;

		for (var i = 0; i < updatedPaths.length; i++) {
			updatedPaths[i]
		};

		this.copy( tree, [], function( node, path, children ){

			if( !children )
				return;


			// Update the paths
			me.updateNodePaths( node, parentPaths, updatedPaths );

			var nodePaths = node.__paths,
				updatedValue,i,l,j,p
			;
		});
	},

	trigger: function( node, eventName, param ){
		var listener = node.__listener;

		if( listener && !listener.ticking ){
			listener.ticking = true;
			Utils.nextTick( function(){
				listener.ticking = false;
				listener.trigger( eventName, param );
			});
		}
	},

	createListener: function( wrapper ){
		var node = this.nodes[ wrapper.__id ],
			l = node.__listener
		;

		if( !l ) {
			l = Object.create(Emitter, {
				_events: {
					value: [],
					writable: true
				}
			});

			node.__listener = l;
		}

		return l;
	},

	addWrapper: function( node, w ){
		var prevWrapper = node.__wrapper;

		node.__wrapper = w;
		this.nodes[ w.__id ] = node;

		if( node.__toUpdate ) {
			node.__toUpdate = false;
			this.trigger( node, 'update', w );
		}
	},

	getPaths: function( wrapper ){
		return this.nodes[ wrapper.__id ].__paths.slice(0);
	}
});

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
	var updating = false;
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
	};

	var setMixins = function( w, mixin ){
		Utils.addNE( w, {
			__id: createId(),
			__notify: notify,
			set: function( attrs ){
				this.__notify( 'replace', this, attrs );
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
			return subtree;
		}

		if( subtree.__wrapper )
			return subtree.__wrapper;

		// Add the wrapper to the tree
		tree.addWrapper( subtree, w );

		// Freeze if possible
		if( Object.freeze )
			Object.freeze( w );

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

	return Curxor;
}));