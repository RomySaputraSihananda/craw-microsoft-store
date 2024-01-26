import AWS from "aws-sdk";
import dotenv from "dotenv";

dotenv.config();

const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT_URL } = process.env;

export const s3 = new AWS.S3({
  accessKeyId: S3_ACCESS_KEY_ID,
  secretAccessKey: S3_SECRET_ACCESS_KEY,
  endpoint: S3_ENDPOINT_URL,
  s3ForcePathStyle: true,
});

export function uploadS3Json(path, obj, Bucket = "ai-pipeline-statistics") {
  return new Promise((r, reject) => {
    s3.upload(
      {
        Bucket,
        Key: path,
        Body: JSON.stringify(obj, null, 2),
        ContentType: "application/json",
      },
      (err, res) => {
        if (err) return reject(err);
        r(res);
      }
    );
  });
}

export function uploadS3Buffer(
  path,
  buffer,
  content_type,
  Bucket = "ai-pipeline-statistics"
) {
  return new Promise((r, reject) => {
    s3.upload(
      {
        Bucket,
        Key: path,
        Body: buffer,
        ContentType: content_type,
      },
      (err, res) => {
        if (err) return reject(err);
        r(res);
      }
    );
  });
}
