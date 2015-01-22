var assert = require('assert'),
	Curxor = require( '../curxor.js')
;

var curxor, data;

var example = {
	a: 1,
	b: { z: 0, y: 1, x:[ 'A', 'B'] },
	c: [1, 2, {w: 3}],
	d: null
};

describe("Curxor array test", function(){
	beforeEach( function(){
		curxor = new Curxor( example );
		data = curxor.getData();
	});

	it( "Size", function(){
		assert.equal( data.c.size(), 3 );
	});

	it( "Push an element", function(){
		data.c.push( 3 );

		var updated = curxor.getData();

		assert.notEqual( updated, data );
		assert.equal( updated.c[3].val(), 3 );
		assert.equal( updated.c.size(), 4 );
	});

	it( "Append multiple elements", function(){
		data.c.append( [3, 4] );

		var updated = curxor.getData();

		assert.equal( updated.c[3].val(), 3 );
		assert.equal( updated.c[4].val(), 4 );
		assert.equal( updated.c.size(), 5 );
	});

	it( "Push a new element doesnt modify other array elements", function(){
		data.c.append( [3, 4] );

		var updated = curxor.getData();

		assert.equal( updated.c[0], data.c[0] );
		assert.equal( updated.c[1], data.c[1] );
		assert.equal( updated.c[2], data.c[2] );
	});

	it( "Pop an element", function(){
		var element = data.c.pop();

		var updated = curxor.getData();

		console.log( updated );

		assert.equal( element, data.c[2] );
		assert.equal( updated.c[2], undefined );
		assert.equal( updated.c.size(), 2 );
	});

	it( "Unshift", function(){
		var element = data.c.unshift( 0 );

		var updated = curxor.getData();

		assert.equal( updated.c[0], 0 );
		assert.equal( updated.c.size(), 4 );
	});


	it( "Unshift should not modify other array elements", function(){
		var element = data.c.unshift( 0 );

		var updated = curxor.getData();

		assert.equal( updated.c[1], data.c[0] );
		assert.equal( updated.c[2], data.c[1] );
		assert.equal( updated.c[3], data.c[2] );
	});

	it( "Unshift may update the path of array elements", function(){
		data.c.unshift( 0 );

		var updated = curxor.getData();

		assert.deepEqual( updated.c[1].getPath(), ['c', 1] );
		assert.deepEqual( updated.c[2].getPath(), ['c', 2] );
		assert.deepEqual( updated.c[3].getPath(), ['c', 3] );
		assert.deepEqual( updated.c[3].w.getPath(), ['c', 3, 'w'] );
	});

	it( "Prepend multiple objects", function(){
		data.c.prepend( [-1, -2] );

		var updated = curxor.getData();

		assert.equal( updated.c[0].val(), -1 );
		assert.equal( updated.c[1].val(), -2 );
	});

	it( "Shift", function(){
		var element = data.c.shift();

		var updated = curxor.getData();

		assert.equal( element, data.c[0] );
		assert.equal( updated.c[0], data.c[1] );
		assert.equal( updated.c[1], data.c[2] );
	});

	it( "Splice", function(){
		var removed = data.c.splice(1,1, 'new', 'second' );

		var updated = curxor.getData();

		assert.equal( updated.c[0], data.c[0] );
		assert.equal( updated.c[1].val(), 'new' );
		assert.equal( updated.c[2].val(), 'second' );
		assert.equal( updated.c[3], data.c[2] );
		assert.deepEqual( updated.c[3].w.getPath(), ['c', 3, 'w'] );
	});

	it( "forEach", function(){
		var value = [];

		data.c.forEach( function( w ){
			value.push( w.val() );
		});

		assert.deepEqual( value, data.c.val() );
	}),

	it( "map", function(){
		var wrappers = data.c.map( function( w ){
			return w;
		});

		assert.deepEqual( wrappers, data.c.__children );
	});

	it( "filter", function(){
		var wrappers = data.c.filter( function( w ){
			return w == data.c[2];
		});

		assert.equal( wrappers.length, 1 );
		assert.deepEqual( wrappers[0], data.c[2] );
	});

	it( "indexOf", function(){
		assert.equal( data.c.indexOf( data.c[2] ), 2 );
	});

});