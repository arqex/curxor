'use strict';

//#build
var global = (new Function("return this")());

var Utils = {
	isObject: function( value ){
		return value && value.constructor == Object;
	},

	isArray: function( value ){
		return value && value.constructor == Array;
	},

	isWrapper: function( value ){
		return value && value.__notify;
	},

	createNonEnumerable: function( obj, proto ){
		var ne = {};
		for( var key in obj )
			ne[key] = {value: obj[key] };
		return Object.create( proto || {}, ne );
	},

	error: function( message ){
		var err = new Error( message );
		if( console )
			return console.error( err );
		else
			throw err;
	},

	clone: function( o ){
		if( this.isArray( o ) )
			return o.slice( 0 );

		if( this.isObject( o ) ){
			var clone = {};
			for( var key in o )
				clone[ key ] = o[ key ];
			return clone;
		}

		return o;
	},

	addNE: function( node, attr, value ){
		var attrs = attr;

		if( typeof value != 'undefined' ){
			attrs = {};
			attrs[ attr ] = value;
		}

		for( var key in attrs ){
			Object.defineProperty( node, key, {
				enumerable: false,
				configurable: true,
				writable: true,
				value: attrs[ key ]
			});
		}
	},

	// nextTick - by stagas / public domain
  	nextTick: (function () {
      var queue = [],
			dirty = false,
			fn,

			// Thanks to setImmediate for hasPostMessage,
			// postMessage in IE8 is sync.
			hasPostMessage = (function(){
				if( !global.postMessage ) return false;

				var async = true;
				var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                async = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;

            return async;
			})(),
			messageName = 'nexttick',
			trigger = (function () {
				return hasPostMessage
					? function trigger () {
					global.postMessage(messageName, '*');
				}
				: function trigger () {
					setTimeout(function () { processQueue() }, 0);
				};
			}()),
			processQueue = (function () {
				return hasPostMessage
					? function processQueue (event) {
						if (event.source === global && event.data === messageName) {
							event.stopPropagation();
							flushQueue();
						}
					}
					: flushQueue;
      	})()
      ;

      function flushQueue () {
          while (fn = queue.shift()) {
              fn();
          }
          dirty = false;
      }

      function nextTick (fn) {
          queue.push(fn);
          if (dirty) return;
          dirty = true;
          trigger();
      }

      if (hasPostMessage) global.addEventListener('message', processQueue, true);

      nextTick.removeListener = function () {
          global.removeEventListener('message', processQueue, true);
      }

      return nextTick;
  })()
};
//#build


module.exports = Utils;