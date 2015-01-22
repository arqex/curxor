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
		assert.equal( data.a.val(), example.a );
		assert.deepEqual( data.b.val(), example.b );
		assert.equal( data.b.z.val(), example.b.z );
		assert.equal( data.b.x[0].val(), example.b.x[0] );
		assert.deepEqual( data.c.val(), example.c );
		assert.equal( data.c[0].val(), example.c[0] );
		assert.equal( data.c[2].w.val(), example.c[2].w );
		assert.equal( data.d.val(), example.d);
	});

	it( "Path testing", function(){
		assert.deepEqual( data.a.getPath(), ['a'] );
		assert.deepEqual( data.d.getPath(), ['d'] );
		assert.deepEqual( data.c[2].w.getPath(), ['c', 2, 'w']);
	});

	it( "Update a value", function(){
		data.a.set(2);

		var updated = curxor.getData();

		assert.notEqual( updated, data );
		assert.equal( updated.a.val(), 2 );
	});

	it( "Update a value doesnt modify other elements", function(){
		data.a.set(2);

		var updated = curxor.getData();

		assert.equal( updated.b, data.b );
		assert.equal( updated.c, data.c );
		assert.equal( updated.d, data.d );
	});

	it( "Remove an element", function(){
		data.a.remove();

		var updated = curxor.getData();

		assert.equal( updated.a, undefined );
	});

	it( "A removed element should have not a path", function(){
		data.a.remove();

		var updated = curxor.getData();

		assert.equal( data.a.getPath(), undefined );
	});

	it( "Children of a removed element should have not a path", function(){

		data.b.remove();

		var updated = curxor.getData();

		assert.equal( data.b.getPath(), undefined );
		assert.equal( data.b.z.getPath(), undefined );
		assert.equal( data.b.y.getPath(), undefined );
		assert.equal( data.b.x.getPath(), undefined );
		assert.equal( data.b.x[0].getPath(), undefined );
		assert.equal( data.b.x[1].getPath(), undefined );
	})
});