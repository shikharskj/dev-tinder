import crypto from "node:crypto";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const ATTACHMENT_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const UPLOAD_URL_TTL_SECONDS = 120;
const VIEW_URL_TTL_SECONDS = 3600;

let client = null;

function bucket() {
  return process.env.S3_CHAT_BUCKET || "";
}

export function attachmentsEnabled() {
  return Boolean(bucket() && process.env.AWS_REGION);
}

function s3() {
  client ||= new S3Client({ region: process.env.AWS_REGION });
  return client;
}

function fail(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function attachmentKeyBelongsTo(key, conversationId) {
  return (
    typeof key === "string" &&
    new RegExp(`^chat/${conversationId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`).test(
      key,
    )
  );
}

export async function createUploadTarget(conversationId, contentType, size) {
  if (!attachmentsEnabled()) {
    throw fail("Image sharing isn’t configured.", 501);
  }
  const extension = ATTACHMENT_TYPES[contentType];
  if (!extension) throw fail("Only JPEG, PNG or WebP images are allowed.", 400);
  if (!Number.isInteger(size) || size <= 0 || size > MAX_ATTACHMENT_BYTES) {
    throw fail("Images must be 5 MB or smaller.", 400);
  }

  const key = `chat/${conversationId}/${crypto.randomUUID()}.${extension}`;
  const uploadUrl = await getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );
  return { key, uploadUrl, expiresIn: UPLOAD_URL_TTL_SECONDS };
}

// Confirms the browser really uploaded the object and that it matches limits.
export async function verifyAttachment(key) {
  try {
    const head = await s3().send(
      new HeadObjectCommand({ Bucket: bucket(), Key: key }),
    );
    if (
      !ATTACHMENT_TYPES[head.ContentType] ||
      !head.ContentLength ||
      head.ContentLength > MAX_ATTACHMENT_BYTES
    ) {
      throw fail("Invalid image attachment.", 400);
    }
    return { contentType: head.ContentType, size: head.ContentLength };
  } catch (error) {
    if (error.status) throw error;
    throw fail("Image upload was not completed.", 400);
  }
}

export async function signAttachmentUrls(messages) {
  const urls = new Map();
  if (!attachmentsEnabled()) return urls;
  await Promise.all(
    messages
      .filter((message) => message.attachment?.key)
      .map(async (message) => {
        urls.set(
          String(message._id),
          await getSignedUrl(
            s3(),
            new GetObjectCommand({
              Bucket: bucket(),
              Key: message.attachment.key,
            }),
            { expiresIn: VIEW_URL_TTL_SECONDS },
          ),
        );
      }),
  );
  return urls;
}
