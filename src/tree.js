'use strict';

var Utils = require( './utils.js' );

//#build
var Tree = function( val, els ){
	this.tree = this.clone( val, [] );
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
		target[ key ] = this.prepare( value, path );
	},

	add: function( type, path, values ){
		var target = this.get( path, true );
		for( var key in values ){
			// Remove any reference
			this.removeReferences( target[ key ] );
			target[key] = this.prepare( values[key], path.concat( key ) );
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

		// Prepare new elements
		for( i = 2, l = args.length; i<l; i++ ){
			args[i] = this.prepare( args[i], path.concat( args[0] + i - 2 ) );
		}

		// Delete references to the removed elements
		var removed = target.splice.apply( target, args );
		for( i = 0, l = removed.length; i<l; i++){
			this.removeReferences( removed[i] );
		}

		// Update references for the elements after the inserted ones
		for( i = args[0] + args.length - 2, l=target.length; i<l; i++ ){
			this.refreshReferences( target[i], path.concat( i ) );
		}
	},

	append: function( type, path, els ){
		var target = this.get( path, true );
		for (var i = 0, l = els.length; i < l; i++) {
			target.push( this.clone( els[i] ) );
		}
	},

	prepend: function( type, path, els ){
		var target = this.get( path, true ),
			i, l
		;
		for (i = els.length - 1; i >= 0; i--) {
			target.unshift( this.clone( els[i] ) );
		}
		for (i=els.length, l=target.length; i<l; i++) {
			this.refreshReferences( target[i], path.concat( i ) );
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

	leafProto: {constructor: function(){}},

	clone: function( tree, path ){
		var proto = this.leafProto,
			p = path || []
		;

		return this.copy( tree, p, function( node, path, children ){
			if( children ) {

				return children;
			}

			// Create an object that returns the plain value of the leaf
			return Utils.createNonEnumerable({__leafVal:node}, proto);
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
		this.copy( tree, [], function( node ){
			if( !node || !node.__wrapper )
				return;

			delete els[ node.__wrapper.__id ];
		});
	},

	/**
	 * Refresh the paths of the subtree
	 * @param  {Branch} tree The tree part to update
	 * @param  {Array} path The initial path to start refreshing
	 */
	refreshReferences: function( tree, path ){
		var els = this.els;
		this.copy( tree, path, function( node, path ){
			if( node.__wrapper )
				els[ node.__wrapper.__id ] = path;
		});
	}
});
//#build

module.exports = Tree;