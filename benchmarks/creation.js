'use strict';

var B = require('benchmark'),
	Curxor = require('../curxor'),
	initialData = require('./initialData')
;

var suite = new B.Suite(),
	store = new Curxor( initialData ),
	data = store.getData(),
	leaf = data[1][0][0][0],
	leafData = initialData[1][0][0][0],
	i = 0
;

suite
	.add( 'Curxor creation', function(){
		new Curxor( initialData );
	})
	.add( 'Update 1st level branch', function(){
		data = data.set(0, initialData[0]);
	})
	.add( 'Update leaf', function(){
		leaf = leaf.set(0, leafData);
	})
	.add( 'Copy 1st level branch', function(){
		store.getData().set( 2, data[ i++ % 2 ] );
	})
	.on('cycle', function(event) {
	  console.log(String(event.target));
	})
	.on('complete', function(){
		//console.log( this );
	})
	.run({ async: true})
;