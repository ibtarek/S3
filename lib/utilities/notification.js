'use strict'

import { logger } from '../utilities/logger';
const EventEmitter = require('events');



const notification = new EventEmitter();

	//return a function emitting evtName
notification.wrap = function( evtName , fn , request ) {
	return function() {
		var fnArgs = Array.from(arguments);
		fn.apply(null,fnArgs);
		logger.info('Emitting event', evtName , fnArgs );
		fnArgs.unshift(evtName,request);
		process.nextTick( () => notification.emit.apply( notification , fnArgs ) );
	}
}
module.exports.notification = notification