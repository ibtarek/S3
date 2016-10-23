import async from 'async';
import { errors } from 'arsenal';
import config from '../Config';
import assert from 'assert';
import wrapper from './data-wrapper';
const Jimp = require('jimp')
const Stream = require('stream');
import MD5Sum from '../utilities/MD5Sum';

/*
const hooksConfig = {
    'put:before' : ['test']
}


const pipes = {
    'test' : function( inStream , outStream , log , cb ){
        //
    }
}

function hooks( method , step ){
    let hooksList = hooksConfig[method+':'+step];
    if ( hooksList ){
        hooksList = hooksList.map( hookName => pipes[hookName] || null )

        if ( hooksList.filter( fn => fn == null ).length){
            throw new Error('Error in hooks configuration '+method+':'+step);
        }

        hooksList.reduce( (hookPipelineFn , hookItemFn ) => {
            let fn = (err,dataRetrievalInfo,hashedStream) => {
                hookPipelineFn(err,pi)
            };
            return hookPipelineFn

        })
    }
}*/


function pipeImageGrayScale(stream, keyContext , log, cb){

    //return cb(null,stream);
    const output = new Stream.PassThrough();

    var length;

    output.length = () => length;



    var chunks = [];
    stream.on('data', buf => chunks.push(buf));
    stream.once('end', () => {
        log.info('Making Grayscale image')
        var buffer = Buffer.concat(chunks);
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
                length = buf.length
                output.end(buf , null , () => output.emit('processed'));
                //output.emit('processed');
                
                //return cb(null,output)
            })
        })
    })

    cb(null,output)
}


const data = {
    put: (cipherBundle, value, valueSize, keyContext, log, cb) => {
        log.info('sending put to wrapper', { keyContext, valueSize,
                                                method: 'put' });

        const returnedHashStream = new MD5Sum();
        value.pipe(returnedHashStream);
        let storedSize = 0;

        function cbk(err, dataRetrievalInfo, storedHashStream){
            log.info('done put',dataRetrievalInfo)
            
            return cb(err,dataRetrievalInfo,storedHashStream,returnedHashStream , storedSize);
        }

        
        pipeImageGrayScale( returnedHashStream , keyContext , log ,  ( err, val ) => {
            val.once('processed', () => {
                log.info('Grayscale is done');
                if (err) {
                    log.error(err);
                    return cbk(err);
                }

                log.info('Computed length after processing', val.length());

                const ref = require('fs').createWriteStream('ref.png');
                val.pipe(ref);
                storedSize = val.length()
                

                return wrapper.put(cipherBundle , val, val.length()  , keyContext , log , cbk );
            })
        })


        

        //return wrapper.put(cipherBundle , value , valueSize , keyContext , log , cbk );
    },

    get: wrapper.get,

    delete: wrapper.delete,

    // It would be preferable to have an sproxyd batch delete route to
    // replace this
    batchDelete: wrapper.batchDelete,

    switch: wrapper.switch
};

export default data;
