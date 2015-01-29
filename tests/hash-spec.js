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

describe("Curxor hash test", function(){
	beforeEach( function(){
		curxor = new Curxor( example );
		data = curxor.getData();
	});

	it( "Add a new element to a hash", function(){
		var chained = data.b.set({e:5});

		var updated = curxor.getData();

		assert.equal( chained, updated.b );
		assert.notEqual( updated, data );
		assert.equal( updated.b.e, 5 );
	});

	it( "Add a new element to a hash doesnt modify other hash elements", function(){
		var chained = data.b.set({e:5});

		var updated = curxor.getData();

		assert.equal( chained, updated.b );
		assert.equal( updated.b.z, data.b.z );
		assert.equal( updated.b.y, data.b.y );
		assert.equal( updated.b.x, data.b.x );
	});

	it( "Remove a hash element", function(){
		var chained = data.remove('a');

		var updated = curxor.getData();

		assert.equal( chained, updated );
		assert.equal( updated.a, undefined );
	});

	it( "A removed hash element can't update the data", function(){
		var b = data.b;

		data.remove('b');

		var updated = curxor.getData();

		assert.equal( updated.b, undefined );

		b.set({ z: 2 });

		var second = curxor.getData();

		assert.equal( second, updated );
	});

	it( "Remove multiple hash elements", function(){
		var chained = data.remove(['a', 'b']);

		var updated = curxor.getData();

		assert.equal( chained, updated );
		assert.equal( updated.a, undefined );
		assert.equal( updated.b, undefined );
	});

	it( "Remove elements should not modify other hash elements", function(){
		data.remove(['a', 'b']);

		var updated = curxor.getData();

		assert.equal( updated.c, data.c );
		assert.equal( updated.d, data.d );
	});

	it( "Remove an unexistent element should not modify any element", function(){
		data.remove('u');

		var updated = curxor.getData();

		assert.equal( updated, data );
	});

	it( "Add an null key should work", function(){
		var chained = data.set({u: null});

		var updated = curxor.getData();

		assert.equal( chained, updated );
		assert.equal( updated.u, null );
	});

	it( "Removing a duplicate node should preserve duplicates", function(){
		data.c.set( {0: data.b} );

		var updated = curxor.getData();
		assert.equal( updated.b, updated.c[0] );

		updated.remove( 'b' );

		var second = curxor.getData();

		assert.equal( second.c[0], data.b );
	});

	it( "Removing all duplicates should remove the node", function(){
		data.set( {d: data.b} );

		var updated = curxor.getData(),
			d = updated.d
		;
		assert.equal( updated.b, updated.d );

		updated.remove( 'b' );

		var second = curxor.getData();
		assert.equal( second.d, data.b );

		second.remove( 'd' );

		var third = curxor.getData();
		assert.equal( third.d, undefined );

		d.set({z: 9});

		var fourth = curxor.getData();
		assert.equal( third, fourth );
	});
});