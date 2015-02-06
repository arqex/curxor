'use strict';

var Utils = require( './utils.js' ),
	Mixins = require( './mixins' ),
	Emitter = require( './emitter.js' )
;

var wIndex = 1;
var createId = function(){
	return 'w' + wIndex++;
};

//#build
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
//#build

module.exports = Tree;