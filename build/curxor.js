/* curxor v0.3.0 (6-2-2015)
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
			return this.__notify( 'remove', this, filtered );
		return this;
	}
},

List: {
	push: function( el ){
		return this.append( [el] );
	},

	append: function( els ){
		if( els && els.length )
			return this.__notify( 'splice', this, [this.length, 0].concat( els ) );
		return this;
	},

	pop: function(){
		if( !this.length )
			return this;

		return this.__notify( 'splice', this, [this.length -1, 1] );
	},

	unshift: function( el ){
		return this.prepend( [el] );
	},

	prepend: function( els ){
		if( els && els.length )
			return this.__notify( 'splice', this, [0, 0].concat( els ) );
		return this;
	},

	shift: function(){
		if( !this.length )
			return this;

		return this.__notify( 'splice', this, [0, 1] );
	},

	splice: function( index, toRemove, toAdd ){
		return this.__notify( 'splice', this, arguments );
	}
}

};

var Tree = function( val, notify ){
	this.nodes = {};
	this.notify = notify;
	this.tree = this.prepare( val );
};

Tree.prototype = Utils.createNonEnumerable({
	reset: function( root, wrapper ){
		this.tree = this.prepare( wrapper, [ [] ] );
	},

	update: function( type, wrapper, options){

		if( !this[ type ])
			return Utils.error( 'Unknown update type: ' + type );

		return this[ type ]( wrapper, options );
	},

	replace: function( wrapper, attrs ) {

		var node = this.nodes[ wrapper.__id ],
			paths = node.__paths,
			childPaths, prevNode, newNode, prevWrapper
		;

		for( var key in attrs ){
			prevNode = node[ key ];

			// Create a new wrapper
			node[ key ] = this.prepare( attrs[key] );

			// Remove references to old nodes & wrappers
			if( !this.isLeaf( prevNode ) ) {
				this.unRelate( prevNode, node );
				node[key].__listener = prevNode.__listener;
			}
		}

		this.updateNodePath( node );

		return node.__wrapper;
	},

	remove: function( wrapper, keys ) {
		var node = this.nodes[ wrapper.__id ],
			i, l
		;

		for (i = 0, l = keys.length; i<l; i++) {
			this.unRelate( node[ keys[i] ], node );
			delete node[ keys[i] ];
		}

		this.updateNodePath( node );

		return node.__wrapper;
	},

	splice: function( wrapper, args ){
		var node = this.nodes[ wrapper.__id ],
			i,l
		;

		// Update the tree
		var removed = node.splice.apply( node, args );

		// Prepare new elements
		for( i = 2, l = args.length; i<l; i++ ){
			args[i] = this.prepare( args[i] );
		}

		// Delete references to the removed elements
		for( i = 0, l = removed.length; i<l; i++){
			this.unRelate( removed[i], node );
		}

		this.updateNodePath( node );

		return node.__wrapper;
	},

	unRelate: function( node, parent ){
		if( parent && node && node.__parents ){
			var index = node.__parents.indexOf( parent );
			if( index != -1 )
				node.__parents.splice( index, 1 );

			if( !node.__parents.length )
				delete this.nodes[ node.__wrapper.__id ];
		}

		if( Utils.isObject( node ) ){
			for( var key in node )
				this.unRelate( node[ key ], node );
		}
		else if( Utils.isArray( node ) ){
			for (var i = 0; i < node.length; i++) {
				this.unRelate( node[i], node );
			}
		}
	},

	updateNodePath: function( node ){
		if( !node )
			return;

		var w, i, l, child;

		if( Utils.isObject( node ) ){
			w = {};
			for( var key in node ){
				child = node[ key ];
				w[ key ] = child && child.__wrapper || child;
			}
			this.setMixins( w, Mixins.Hash );
		}
		else {
			w = [];
			for (i = 0, l = node.length; i < l; i++) {
				child = node[ i ];
				w.push( child && child.__wrapper || child );
			}
			this.setMixins( w, Mixins.List );
		}

		if( Object.freeze )
			Object.freeze( w );

		delete this.nodes[ node.__wrapper.__id ];
		node.__wrapper = w;
		this.nodes[ w.__id ] = node;

		this.trigger( node, 'update', w );

		for (i = 0; i < node.__parents.length; i++) {
			this.updateNodePath( node.__parents[i] );
		}
	},

	isLeaf: function( node ){
		return !node || !node.__wrapper;
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

	prepare: function( tree ){
		if( Utils.isWrapper( tree ) ){
			var topNode = this.nodes[ tree.__id ];

			// If it is an exisiting node, return it!
			if( topNode ){
				console.log( 'copy');
				return topNode;
			}
		}

		// If it is not a known node, wrap it
		return this.wrap( tree );
	},

	wrap: function( tree ){
		var type = Utils.isObject( tree ) ? 0 : ( Utils.isArray( tree ) ? 1 : 2 ),
			isWrapper = Utils.isWrapper( tree ),
			node, child, wrapper
		;

		// Return the leaves as they are
		if( type === 2 )
			return tree;

		node = this.addNodeProperties( type ? [] : {} );
		wrapper = isWrapper ? tree : ( type ? [] : {} );

		if( type ){
			for (var i = 0, l = tree.length; i < l; i++) {
				this.wrapChild( node, tree[i], i, wrapper );
			}
		}
		else {
			for( var key in tree ){
				this.wrapChild( node, tree[key], key, wrapper );
			}
		}

		if(!isWrapper)
			this.setMixins( wrapper, type ? Mixins.List : Mixins.Hash );

		if( Object.freeze )
			Object.freeze( wrapper );

		node.__wrapper = wrapper;
		this.nodes[ wrapper.__id ] = node;

		return node;
	},

	wrapChild: function( node, treeNode, key, w ){
		var child = this.prepare( treeNode );
		node[ key ] = child;

		// If w it is not a wrapper, add the children
		if( !Utils.isWrapper( w ) )
			w[ key ] = child && child.__wrapper ? child.__wrapper : child;

		if( child && child.__parents )
			child.__parents.push( node );
	},

	setMixins: function( w, mixin ){
		Utils.addNE( w, {
			__id: createId(),
			__notify: this.notify,
			set: function( attr, value ){
				var attrs = attr;

				if( typeof value != 'undefined' ){
					attrs = {};
					attrs[ attr ] = value;
				}

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
	},

	addNodeProperties: function( tree, currentPath ) {
		 Utils.addNE( tree, {
			__listener: false,
			__parents: [],
			__wrapper: false,
			__toUpdate: false,
			__toReturn: false
		});

		 return tree;
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
	}

});

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

	return Curxor;
}));