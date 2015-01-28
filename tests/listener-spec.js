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

	it( "Creating a listener", function(){
		var listener = data.b.getListener();
		assert.notEqual( listener.on, undefined );
		assert.notEqual( listener.once, undefined );
		assert.notEqual( listener.off, undefined );
		assert.notEqual( listener.trigger, undefined );
	});

	it( "Listen to node updates", function( done ){
		var listener = data.b.getListener();

		listener.on( 'update', function( data ){
			assert.equal( data.c, 3 );
			assert.equal( curxor.getData().b.c, 3 );
			done();
		});

		data.b.set( {c: 3} );
	});

	it( "Listen to root updates", function( done ){

		curxor.on( 'update', function(){
			assert.equal( curxor.getData().b.c, 3 );
			done();
		});

		data.b.set( {c: 3} );
	});

	it( "Listen to updates adding a duplicate", function( done ){
		var listener = data.c.getListener();

		listener.on( 'update', function( d ){
			assert.equal( d[2].u, data.b.x );
			assert.equal( curxor.getData().c[2].u, curxor.getData().b.x );
			done();
		});

		data.c[2].set({u: data.b.x});
	});

	it( "Listen to multiple updates", function( done ){
		var listener = data.b.getListener(),
			i = 3
		;

		listener.on( 'update', function( data ){
			assert.equal( data.c, i );

			if( i == 6 )
				done();
			else
				data.set({c: ++i});
		});

		data.b.set( {c: ++i} );
	});

	it( "Replace the data should trigger an update", function( done ){

		data.b.set( {c: 3} );

		curxor.on( 'update', function(){
			assert.deepEqual( curxor.getData(), data );
			done();
		});

		curxor.setData( data );
	});

	it( "Unmodified wrappers when replacing the data sould preserve the listeners", function( done ){
		data.b.set( {z:2, y: 3} );
		data.c.shift();

		var updated = curxor.getData(),
			listener = updated.c[1].getListener()
		;

		listener.on( 'update', function( data ){
			assert.equal( data.u, 10 );
			done();
		});

		curxor.setData( data );
		curxor.getData().c[2].set({u: 10});
	})


});