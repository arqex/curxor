'use strict';

var Utils = require( './utils.js' ),
	Emitter = require( './emitter.js' )
;

//#build
var Tree = function( val, els ){
	this.tree = this.prepare( val, [ [] ] );
	this.nodes = {};
	this.noPathNodes = {};
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

		node.__toReturn = true;
	},

	remove: function( wrapper, keys ) {
		var node = this.nodes[ wrapper.__id ],
			paths = node.__paths,
			i, l
		;

		this.cleanPaths( paths );

		for (i = 0, l = keys.length; i<l; i++) {
			this.removeReferences( node[ keys[i] ], this.addToPaths( paths, keys[i] ), true );
			delete node[ keys[i] ];
		}

		node.__toReturn = true;
	},

	splice: function( wrapper, args ){
		var node = this.nodes[ wrapper.__id ],
			paths = node.__paths,
			i,l
		;

		this.cleanPaths( paths );

		// Update the tree
		var removed = node.splice.apply( node, args );

		// Prepare new elements
		for( i = 2, l = args.length; i<l; i++ ){
			args[i] = this.prepare( args[i], this.addToPaths( paths, args[0] + i - 2 ) );
		}

		// Delete references to the removed elements
		for( i = 0, l = removed.length; i<l; i++){
			this.removeReferences( removed[i], this.addToPaths( paths, i) );
		}

		// Update references for the elements after the inserted ones
		for( i = args[0] + args.length - 2, l=node.length; i<l; i++ ){
			this.refreshReferences( node[i], paths, this.addToPaths( paths, i ) );
		}

		node.__toReturn = true;
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
			__toUpdate: false,
			__toReturn: false
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

		// Reuse the wrapper
		children.__wrapper = wrapper;
		this.nodes[ children.__wrapper.__id ] = children;

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
//#build

module.exports = Tree;