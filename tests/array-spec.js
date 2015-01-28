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

	it( "Push an element", function(){
		data.c.push( 3 );

		var updated = curxor.getData();

		assert.notEqual( updated, data );
		assert.equal( updated.c[3], 3 );
		assert.equal( updated.c.length, 4 );
	});

	it( "Append multiple elements", function(){
		data.c.append( [3, 4] );

		var updated = curxor.getData();

		assert.equal( updated.c[3], 3 );
		assert.equal( updated.c[4], 4 );
		assert.equal( updated.c.length, 5 );
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

		assert.equal( element, data.c[2] );
		assert.equal( updated.c[2], undefined );
		assert.equal( updated.c.length, 2 );
	});

	it( "Unshift", function(){
		var element = data.c.unshift( 0 );

		var updated = curxor.getData();

		assert.equal( updated.c[0], 0 );
		assert.equal( updated.c.length, 4 );
	});


	it( "Unshift should not modify other array elements", function(){
		var element = data.c.unshift( 0 );

		var updated = curxor.getData();

		assert.equal( updated.c[1], data.c[0] );
		assert.equal( updated.c[2], data.c[1] );
		assert.equal( updated.c[3], data.c[2] );
	});

	it( "Unshift may update the path of array elements", function(){
		data.c.set( {3: {arr: [0, {deep: true}, 2]} } );

		var updated = curxor.getData();

		updated.c.unshift( 0 );

		var second = curxor.getData();

		assert.deepEqual( second.c[3].getPaths(), [['c', 3]] );
		assert.deepEqual( second.c[4].arr[1].getPaths(), [['c', 4, 'arr', 1]] );
	});

	it( "Prepend multiple objects", function(){
		data.c.prepend( [-1, -2] );

		var updated = curxor.getData();

		assert.equal( updated.c[0], -1 );
		assert.equal( updated.c[1], -2 );
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
		assert.equal( updated.c[1], 'new' );
		assert.equal( updated.c[2], 'second' );
		assert.equal( updated.c[3], data.c[2] );
		assert.deepEqual( updated.c[3].getPaths(), [['c', 3]] );
	});

});