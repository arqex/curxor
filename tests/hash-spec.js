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
		data.b.add({e:5});

		var updated = curxor.getData();

		assert.notEqual( updated, data );
		assert.equal( updated.b.e.val(), 5 );
	});

	it( "Add a new element to a hash doesnt modify other hash elements", function(){
		data.b.add({e:5});

		var updated = curxor.getData();

		assert.equal( updated.b.z, data.b.z );
		assert.equal( updated.b.y, data.b.y );
		assert.equal( updated.b.x, data.b.x );
	});

	it( "Remove an element", function(){
		data.a.remove();

		var updated = curxor.getData();

		assert.equal( updated.a, undefined );
	});

	it( "Remove a hash element", function(){
		data.remove('a');

		var updated = curxor.getData();

		assert.equal( updated.a, undefined );
	});

	it( "Remove multiple hash elements", function(){
		data.remove(['a', 'b']);

		var updated = curxor.getData();

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
		data.add('u', null);

		var updated = curxor.getData();

		assert.notEqual( updated.u, null );
		assert.equal( updated.u.val(), null );
	});
});