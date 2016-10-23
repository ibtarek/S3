import {notification} from '../lib/utilities/notification';
import { logger } from '../lib/utilities/logger';
import api from '../lib/api/api';
import data from '../lib/data/wrapper';
const fs = require('fs');
const Jimp = require('jimp')

var Faced = require('faced');
var faced = new Faced();

const outputPath = __dirname + '/../tmp';

module.exports = function( server ){



	notification.on('objectPut' , function( request, err ){
		logger.info('Starting image processing');
		const fileName = request.objectKey;
		if (err){
			//fail
		} else {
			logger.info('Processing image %s/%s ' , request.bucketName , request.objectKey );
			//const log = logger.newRequestLogger(request.objectKey)
			retrieveObjectData(request,(err,stream) => {
				if(err){
					return logger.error('An error occured',err)
				}
				logger.info('Retrieved data stream');
				process(request,stream,logger,()=>{
					logger.info('done processing image');
				})
			})

		}
	})


	logger.info('image-processing ready');

}


function retrieveObjectData( request , cb ){
	const log = logger.newRequestLogger(request.objectKey)

	api.callApiMethod('objectGet', request, log, apiCallback);

	function apiCallback(err, dataGetInfo, resMetaHeaders, range){ 
		//logger.info('from objectGet ',err,dataGetInfo,resMetaHeaders);
		if (err){
			return cb(err)
		} else {
			const key = dataGetInfo[0].key;
			if ( resMetaHeaders['Content-Type'].indexOf('image/') !== -1 ){
				logger.warn('This is a PNG image')
				data.get(key,log, cb)
			}
		}
	}
	

}



function process( request , stream , log , cb ){
	const fileName = request.objectKey;
	const output = fs.createWriteStream(outputPath+'/'+fileName);
	var chunks = [];
	stream.on('data', buf => chunks.push(buf));
	stream.once('end', () => {
	    log.info('Making Processed image')
	    var buffer = Buffer.concat(chunks);

	    faceDetect(buffer, ( err , faces ) => {
	    	Jimp.read(buffer , ( err , image ) => {



		        image
		        //.quality(60)
		        .greyscale()
		        .getBuffer(Jimp.MIME_PNG , (err,buf)=>{
		            if (err){
		                return cb(err);
		            }
		            log.info('Writing Grayscale image stream ' , buf.length)
		            //const output = new Stream.PassThrough();
		            //length = buf.length
		            output.end(buf , null , (err) => output.emit('processed'));
		            //output.emit('processed');
		            
		            //return cb(null,output)
		        })
		    })
	    });

	    
	})
}


function faceDetect(buffer , cb ){
	faced.detect(buffer, function (faces, image, file) {
	  if (!faces) {
	    return logger.info("No faces found!");
	  }
	 
	  var face = faces[0];
	 
	  logger.info(
	    "Found a face at %d,%d with dimensions %dx%d",
	    face.getX(),
	    face.getY(),
	    face.getWidth(),
	    face.getHeight()
	  );
	 
	  logger.info(
	    "What a pretty face, it %s a mouth, it %s a nose, it % a left eye and it %s a right eye!",
	    face.getMouth() ? "has" : "does not have",
	    face.getNose() ? "has" : "does not have",
	    face.getEyeLeft() ? "has" : "does not have",
	    face.getEyeRight() ? "has" : "does not have"
	  );

	  return cb(null,faces || [])
	});
}



/**/