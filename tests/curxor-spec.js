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

describe("Curxor test", function(){
	beforeEach( function(){
		curxor = new Curxor( example );
		data = curxor.getData();
	});

	it( "Create a curxor object", function(){
		assert.equal( data.a, example.a );
		assert.deepEqual( data.b, example.b );
		assert.equal( data.b.z, example.b.z );
		assert.equal( data.b.x[0], example.b.x[0] );
		assert.deepEqual( data.c, example.c );
		assert.equal( data.c[0], example.c[0] );
		assert.equal( data.c[2].w, example.c[2].w );
		assert.equal( data.d, example.d);
	});

	it( "Every node has an __id", function(){
		assert.notEqual( data.b.__id, undefined );
		assert.notEqual( data.b.x.__id, undefined );
		assert.notEqual( data.c.__id, undefined );
		assert.notEqual( data.c[2].__id, undefined );
	});

	it( "Leaves dont have an __id", function(){
		assert.equal( data.a.__id, undefined );
		assert.equal( data.b.z.__id, undefined );
		assert.equal( data.c[1].__id, undefined );
	});

	it( "Update a value", function(){
		data.set({a: 2});

		var updated = curxor.getData();

		assert.equal( updated.a, 2 );
		assert.notEqual( updated, data );
	});

	it( "Update a value doesnt modify other elements", function(){
		data.set({a: 2});

		var updated = curxor.getData();

		assert.equal( updated.b, data.b );
		assert.equal( updated.c, data.c );
		assert.equal( updated.d, data.d );
	});

	it( "Update an array value", function(){
		data.c.set({0: 2});

		var updated = curxor.getData();

		assert.equal( updated.c[0], 2 );
		assert.notEqual( updated, data );
		assert.notEqual( updated.c, data.c );
	});

	it( "Update an array value doesnt modify other elements", function(){
		data.c.set({1: 2});

		var updated = curxor.getData();

		assert.equal( updated.a, data.a );
		assert.equal( updated.b, data.b );
		assert.equal( updated.c[0], data.c[0] );
		assert.equal( updated.c[2], data.c[2] );
	});

	it( "Duplicate node", function(){
		data.set( {d: data.b} );
		var updated = curxor.getData();

		assert.equal( data.b, updated.d );
		assert.notEqual( data, updated );
	});

	it( "A duplicate node should be updated in every part of the tree", function(){
		data.set( {d: data.b} );
		data.b.set( {z: 2} );

		var updated = curxor.getData();

		assert.equal( updated.b, updated.d );
		assert.equal( updated.d.z, 2 );
	});

	it( "Restore a previous state", function(){
		data.set( {e: 9, f: 8} );
		data.b.set( {y: 10} );

		var updated = curxor.getData();

		assert.equal( updated.b.y, 10 );
		assert.equal( updated.e, 9 );
		assert.equal( updated.f, 8 );
		assert.equal( updated.c, data.c );


		curxor.setData( data );

		var second = curxor.getData();

		assert.equal( second, data );
		assert.equal( second.e, undefined );
		assert.equal( second.c, data.c );
		assert.equal( second.b.y, data.b.y );
	});

	it( "Chaining calls", function(){
		var chained = data.set( {e: 9} )
			.set( {f: 0} )
			.set( {a: [2,3,4] } )
		;
		var updated = curxor.getData();

		assert.equal( chained, updated );
	});



});