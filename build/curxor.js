/* curxor v0.1.0 (22-1-2015)
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
		return value && value instanceof Wrapper;
	},

	createNonEnumerable: function( obj, proto ){
		var ne = {};
		for( var key in obj )
			ne[key] = {value: obj[key] };
		return Object.create( proto || {}, ne );
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
		if( !k )
			return this.__notify( 'remove', this );

		if( !Utils.isArray( k ) )
			k = [k];

		for(var i=0,l=k.length; i<l; i++){
			if( this.hasOwnProperty( k[i] ) )
				this.__notify( 'remove', this, key );
		}
	}
}, Wrapper.prototype);

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

var Tree = function( val, els ){
	this.tree = this.clone( val );
	this.els = els;
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
		var target = this.getParent( path, true ),
			key = path[ path.length - 1 ]
		;

		// Remove any reference
		this.removeReferences( target[key] );

		//Update the tree
		target[ key ] = this.clone( value );
	},

	add: function( type, path, values ){
		var target = this.get( path, true );
		for( var key in values ){
			// Remove any reference
			this.removeReferences( target[ key ] );
			target[key] = this.clone( values[key] );
		}
	},

	remove: function( type, path, keys ) {
		var target, i, l;

		// If we want to remove some keys from a hash
		if( keys ) {
			target = this.get( path, true );
			for (i = 0, l = keys.length; i<l; i++) {
				this.removeReferences( target[ keys[i] ] );
				delete target[ keys[i] ];
			}
		}
		else {
			// We want to remove the object itself
			target = this.getParent( path, true );
			i = path[ path.length - 1];
			if( Utils.isObject( target ) ){
				this.removeReferences( target[ i ] );
				delete target[ i ];
			}
			else if( Utils.isArray( target ) ){
				this.removeReferences( target[ i ] );
				target.splice( i, 1 );
			}
		}
	},

	splice: function( type, path, args ){
		var target = this.get( path, true ),
			i,l
		;
		for( i = 2, l = args.length; i<l; i++ ){
			args[i] = this.clone( args[i] );
		}
		var removed = target.splice.apply( target, args );
		for( i = 0, l = removed.length; i<l; i++){
			this.removeReferences( removed[i] );
		}
	},

	append: function( type, path, els ){
		var target = this.get( path, true );
		for (var i = 0, l = els.length; i < l; i++) {
			target.push( this.clone( els[i] ) );
		}
	},

	prepend: function( type, path, els ){
		var target = this.get( path, true );
		for (var i = 0, l = els.length; i < l; i++) {
			target.push( this.clone( els[i] ) );
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

	getParent: function( path, doCleaning ){
		return this.get( path.slice( 0, path.length - 1), doCleaning );
	},

	each: function( tree, clbk ){
		clbk( tree );
		if( Utils.isObject( tree ) ){
			for( var key in tree ){
				clbk( tree[ key ] );
			}
		}
		else if ( Utils.isArray( tree ) ){
			for (var i = 0, l = tree.length; i < l; i++) {
				clbk( tree[i] );
			}
		}
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

	clone: function( tree ){
		return this.copy( tree, [], function( node, path, children ){
			return children || new Object( node );
		})
	},

	prepare: function( tree, path ){
		if( Utils.isWrapper( tree ) )
			return this.prepareWrapper( tree, path );
		return this.clone( tree );
	},

	prepareWrapper: function( wrapper, path ){
		var els = this.els;
		return this.copy( wrapper, path, function( node, path, children ){
			var childWrappers = node.__children,
				result, i, l
			;
			if( !childWrappers ){
				result = new Object( node.val() );
			}
			else if( Utils.isArray( childWrappers ) ){ // ArrayWrapper
				result = [];
				for( i=0,l=childWrappers.length; i<l; i++ )
					result.push( children[i] );
			}
			else { // HashWrapper
				result = children;
			}

			result.__wrapper = node;
			els[ node.__id ] = path;

			return result;
		});
	},

	cloneOk: function( val ){
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
	},

	/**
	 * Deletes the keys from the element object, to destroy
	 * outdated references to wrappers.
	 *
	 * @param  {Branch} tree The part of the tree to remove the references
	 */
	removeReferences: function( tree ){
		var els = this.els;
		this.each( tree, function( node ){
			if( !node || !node.__wrapper )
				return;

			delete els[ node.__wrapper.__id ];
		});
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
		if( subtree.__wrapper ){
			elements[ subtree.__wrapper.__id ] = path;
			return subtree.__wrapper;
		}

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
		elements[ w.__id ] = path;

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

	return Curxor;
}));