import crypto from "node:crypto";
import { v2 as cloudinary } from "cloudinary";

const MB = 1024 * 1024;

export const MEDIA_KINDS = {
  image: {
    resourceType: "image",
    formats: { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" },
    maxBytes: 10 * MB,
    message: "Photos must be JPEG, PNG or WebP and 10 MB or smaller.",
  },
  video: {
    resourceType: "video",
    formats: { mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm" },
    maxBytes: 50 * MB,
    maxDuration: 60,
    message: "Videos must be MP4, MOV or WebM, 50 MB or smaller and up to 60 seconds.",
  },
};

const SIGNATURE_TTL_SECONDS = 120;
let configured = false;

export function attachmentsEnabled() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function sdk() {
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

function fail(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function folderFor(conversationId) {
  return `devtinder/chat/${conversationId}`;
}

export function publicIdBelongsTo(publicId, conversationId) {
  return (
    typeof publicId === "string" &&
    new RegExp(`^devtinder/chat/${conversationId}/[0-9a-f-]{36}$`).test(publicId)
  );
}

// Signs one upload. The browser cannot change the asset path, type or delivery mode.
export function createUploadTarget(conversationId, kind, contentType, size) {
  if (!attachmentsEnabled()) throw fail("Media sharing isn’t configured.", 501);
  const rules = MEDIA_KINDS[kind];
  if (
    !rules ||
    !Object.values(rules.formats).includes(contentType) ||
    !Number.isInteger(size) ||
    size <= 0 ||
    size > rules.maxBytes
  ) {
    throw fail(rules?.message || "Choose a photo or a video.", 400);
  }

  const publicId = `${folderFor(conversationId)}/${crypto.randomUUID()}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp, type: "authenticated" };
  const signature = sdk().utils.api_sign_request(
    params,
    process.env.CLOUDINARY_API_SECRET,
  );

  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${rules.resourceType}/upload`,
    apiKey: process.env.CLOUDINARY_API_KEY,
    ...params,
    signature,
    publicId,
    resourceType: rules.resourceType,
    expiresIn: SIGNATURE_TTL_SECONDS,
  };
}

export async function deleteMedia(attachment) {
  if (!attachmentsEnabled() || !attachment?.publicId) return;
  try {
    await sdk().uploader.destroy(attachment.publicId, {
      resource_type: attachment.resourceType,
      type: "authenticated",
      invalidate: true,
    });
  } catch (error) {
    console.error("Unable to delete media:", error?.message);
  }
}

// Confirms the browser really uploaded the asset and that it matches limits.
export async function verifyAttachment(publicId, kind) {
  const rules = MEDIA_KINDS[kind];
  if (!rules) throw fail("Invalid attachment.", 400);

  let asset;
  try {
    asset = await sdk().api.resource(publicId, {
      resource_type: rules.resourceType,
      type: "authenticated",
    });
  } catch {
    throw fail("The upload was not completed.", 400);
  }

  const contentType = rules.formats[String(asset.format || "").toLowerCase()];
  const invalid =
    !contentType ||
    !asset.bytes ||
    asset.bytes > rules.maxBytes ||
    (rules.maxDuration && !(asset.duration > 0 && asset.duration <= rules.maxDuration + 0.5));
  if (invalid) {
    await deleteMedia({ publicId, resourceType: rules.resourceType });
    throw fail(rules.message, 400);
  }

  return {
    publicId,
    resourceType: rules.resourceType,
    format: String(asset.format).toLowerCase(),
    contentType,
    size: asset.bytes,
    width: asset.width || undefined,
    height: asset.height || undefined,
    duration: asset.duration || undefined,
  };
}

function deliveryUrl(attachment, options = {}) {
  return sdk().url(attachment.publicId, {
    resource_type: attachment.resourceType,
    type: "authenticated",
    sign_url: true,
    secure: true,
    ...options,
  });
}

function urlsFor(attachment) {
  if (attachment.resourceType === "video") {
    const poster = {
      format: "jpg",
      transformation: [{ width: 640, crop: "limit", start_offset: 0 }],
    };
    return {
      url: deliveryUrl(attachment, { format: "mp4" }),
      thumbUrl: deliveryUrl(attachment, poster),
      posterUrl: deliveryUrl(attachment, poster),
    };
  }
  return {
    url: deliveryUrl(attachment, {
      transformation: [
        { width: 1600, crop: "limit", quality: "auto", fetch_format: "auto" },
      ],
    }),
    thumbUrl: deliveryUrl(attachment, {
      transformation: [
        { width: 480, crop: "limit", quality: "auto", fetch_format: "auto" },
      ],
    }),
  };
}

// Maps message id -> signed delivery URLs (Cloudinary signs them locally).
export async function signAttachmentUrls(messages) {
  const urls = new Map();
  if (!attachmentsEnabled()) return urls;
  for (const message of messages) {
    if (message.attachment?.publicId) {
      urls.set(String(message._id), urlsFor(message.attachment));
    }
  }
  return urls;
}
