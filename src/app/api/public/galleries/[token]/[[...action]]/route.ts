import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { guestGallery, guestGalleryInfo } from "@/modules/photos/guest-gallery";
import {
  listPhotos,
  reserveUpload,
  confirmUpload,
  uploadStagingFallback,
} from "@/modules/photos/use-cases";
import {
  listPhotosQuerySchema,
  uploadUrlSchema,
  confirmPhotoSchema,
  MAX_PHOTO_BYTES,
} from "@/modules/photos/schemas";
import { checkOrigin, parseBody, weddingFailure } from "@/server/wedding/http";
import { consumeLimit } from "@/server/auth/rate-limit";
import { WeddingError } from "@/modules/wedding/errors";
type Context = { params: Promise<{ token: string; action?: string[] }> };
const headers = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow",
};
const TICKET = "mmm_gallery_upload";
function uploadTicket(request: NextRequest) {
  const existing = request.cookies.get(TICKET)?.value;
  return existing && /^[A-Za-z0-9_-]{32,64}$/.test(existing)
    ? existing
    : randomBytes(24).toString("base64url");
}
function ticketCookie(token: string, ticket: string, secure: boolean) {
  return {
    name: TICKET,
    value: ticket,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure,
      // Prefix of this album only. Browsers send it on /photos and
      // /upload-url, but not on another wedding's gallery token.
      path: `/api/public/galleries/${encodeURIComponent(token)}/`,
      maxAge: 60 * 60,
    },
  };
}
export async function GET(request: NextRequest, context: Context) {
  try {
    const { token, action = [] } = await context.params;
    const wedding = await guestGallery(token);
    await consumeLimit(`guest-gallery:reads:${wedding._id}`, 3000);
    if (!action.length)
      return NextResponse.json(
        { data: await guestGalleryInfo(token) },
        { headers },
      );
    if (action.join("/") !== "photos")
      throw new WeddingError("NOT_FOUND", "Not found.", 404);
    const query = listPhotosQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!query.success)
      throw new WeddingError(
        "VALIDATION_ERROR",
        "Check your gallery filters.",
        400,
      );
    const result = await listPhotos(String(wedding._id), query.data);
    return NextResponse.json(
      {
        ...result,
        data: result.data.map((photo) => ({
          id: photo.id,
          eventId: photo.eventId,
          url: photo.url,
          filename: photo.originalFilename,
        })),
      },
      { headers },
    );
  } catch (error) {
    return weddingFailure(error);
  }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    checkOrigin(request);
    const { token, action = [] } = await context.params;
    const wedding = await guestGallery(token, true);
    await consumeLimit(`guest-gallery:uploads:${wedding._id}`, 60);
    const ticket = uploadTicket(request);
    const path = action.join("/");
    if (path === "upload-fallback") {
      const key = request.nextUrl.searchParams.get("objectKey");
      if (!key || key.length > 300)
        throw new WeddingError(
          "VALIDATION_ERROR",
          "Choose the photo again.",
          400,
        );
      const reader = request.body?.getReader();
      if (!reader)
        throw new WeddingError("VALIDATION_ERROR", "Choose a photo.", 400);
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_PHOTO_BYTES) {
          await reader.cancel();
          throw new WeddingError(
            "VALIDATION_ERROR",
            "Each photo must be 4 MB or smaller.",
            400,
          );
        }
        chunks.push(value);
      }
      await uploadStagingFallback(
        String(wedding._id),
        null,
        key,
        Buffer.concat(chunks),
        ticket,
      );
      const uploaded = NextResponse.json(
        { data: { success: true } },
        { headers },
      );
      const uploadedCookie = ticketCookie(
        token,
        ticket,
        request.nextUrl.protocol === "https:",
      );
      uploaded.cookies.set(
        uploadedCookie.name,
        uploadedCookie.value,
        uploadedCookie.options,
      );
      return uploaded;
    }
    if (path === "upload-url") {
      const reserved = NextResponse.json(
        {
          data: await reserveUpload(
            String(wedding._id),
            null,
            await parseBody(request, uploadUrlSchema),
            ticket,
          ),
        },
        { status: 201, headers },
      );
      const reservedCookie = ticketCookie(
        token,
        ticket,
        request.nextUrl.protocol === "https:",
      );
      reserved.cookies.set(
        reservedCookie.name,
        reservedCookie.value,
        reservedCookie.options,
      );
      return reserved;
    }
    if (path === "photos") {
      const confirmed = NextResponse.json(
        {
          data: await confirmUpload(
            String(wedding._id),
            null,
            await parseBody(request, confirmPhotoSchema),
            ticket,
          ),
        },
        { status: 201, headers },
      );
      const confirmedCookie = ticketCookie(
        token,
        ticket,
        request.nextUrl.protocol === "https:",
      );
      confirmed.cookies.set(
        confirmedCookie.name,
        confirmedCookie.value,
        confirmedCookie.options,
      );
      return confirmed;
    }
    throw new WeddingError("NOT_FOUND", "Not found.", 404);
  } catch (error) {
    return weddingFailure(error);
  }
}
