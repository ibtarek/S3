import assert from 'assert';

import withV4 from '../support/withV4';
import BucketUtility from '../../lib/utility/bucket-util';

const bucket = 'testgetmpubucket';
const key = 'key';

describe('GET object, multipart upload [Cache-Control, Content-Disposition, ' +
'Content-Encoding, Expires headers]', () => {
    withV4(sigCfg => {
        let bucketUtil;
        let s3;
        let uploadId;
        const cacheControl = 'max-age=86400';
        const contentDisposition = 'attachment; filename="fname.ext";';
        const contentEncoding = 'aws-chunked,gzip';
        // AWS Node SDK requires Date object, ISO-8601 string, or
        // a UNIX timestamp for Expires header
        const expires = new Date();

        before(() => {
            const params = {
                Bucket: bucket,
                Key: key,
                CacheControl: cacheControl,
                ContentDisposition: contentDisposition,
                ContentEncoding: contentEncoding,
                Expires: expires,
            };
            bucketUtil = new BucketUtility('default', sigCfg);
            s3 = bucketUtil.s3;
            return s3.createBucketAsync({ Bucket: bucket })
            .then(() => s3.createMultipartUploadAsync(params))
            .then(res => {
                uploadId = res.UploadId;
                return uploadId;
            })
            .catch(err => {
                process.stdout.write(`Error in before: ${err}\n`);
                throw err;
            });
        });
        after(() => {
            process.stdout.write('Emptying bucket\n');
            return bucketUtil.empty(bucket)
            .then(() => {
                process.stdout.write('Deleting bucket\n');
                bucketUtil.deleteOne(bucket);
            })
            .catch(err => {
                process.stdout.write('Error in after\n');
                throw err;
            });
        });
        it('should return additional headers when get request is performed ' +
        'on MPU, when they are specified in creation of MPU',
        () => {
            const params = { Bucket: bucket, Key: 'key', PartNumber: 1,
            UploadId: uploadId };
            return s3.uploadPartAsync(params)
            .catch(err => {
                process.stdout.write(`Error in uploadPart ${err}\n`);
                throw err;
            })
            .then(res => {
                process.stdout.write('about to complete multipart upload\n');
                return s3.completeMultipartUploadAsync({
                    Bucket: bucket,
                    Key: key,
                    UploadId: uploadId,
                    MultipartUpload: {
                        Parts: [
                            { ETag: res.ETag, PartNumber: 1 },
                        ],
                    },
                });
            })
            .catch(err => {
                process.stdout.write(`Error completing upload ${err}\n`);
                throw err;
            })
            .then(() => {
                process.stdout.write('about to get object\n');
                return s3.getObjectAsync({
                    Bucket: bucket, Key: key,
                });
            })
            .catch(err => {
                process.stdout.write(`Error getting object ${err}\n`);
                throw err;
            })
            .then(res => {
                assert.strictEqual(res.CacheControl, cacheControl);
                assert.strictEqual(res.ContentDisposition, contentDisposition);
                assert.strictEqual(res.ContentEncoding, 'gzip');
                assert.strictEqual(res.Expires, expires.toGMTString());
            });
        });
    });
});
