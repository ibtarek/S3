import {notification} from '../lib/utilities/notification';
import { logger } from '../lib/utilities/logger';

//simple plugin, once an object is saved, it logs a message with a hugely overestimated size
module.exports = function trumpPlugin( server ){

	notification.on('objectPut', ( request ) => {

		let bucketName = request.bucketName
		let fileName = request.objectKey

		logger.info('File saved %s. Size %sMB',bucketName, Math.round(Math.random()*99999999999999999));
	})


}