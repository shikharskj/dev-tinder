import "dotenv/config";
import { SESClient } from "@aws-sdk/client-ses";

const accessKeyId = process.env.AWS_SES_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SES_SECRET_KEY;

if (!process.env.AWS_REGION) {
  throw new Error("AWS_REGION is required");
}

if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
  throw new Error("Both AWS SES credential variables must be provided");
}

const sesClient = new SESClient({
  region: process.env.AWS_REGION,

  // Local development: use your existing IAM user credentials.
  // EC2: omit these variables to use the attached instance role.
  ...(accessKeyId && secretAccessKey
    ? {
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      }
    : {}),
});

export { sesClient };