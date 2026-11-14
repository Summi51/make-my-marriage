import "server-only";
import { WeddingError } from "@/modules/wedding/errors";
import type { z } from "zod";
import type { discoveryQuerySchema } from "./schemas";

const LABELS: Record<string, string> = {
  PHOTOGRAPHER: "wedding photographers",
  VIDEOGRAPHER: "wedding videographers",
  VENUE: "wedding venues",
  CATERER: "wedding caterers",
  DECORATOR: "wedding decorators",
  DJ: "wedding DJs",
  MAKEUP_ARTIST: "bridal makeup artists",
  MEHENDI_ARTIST: "mehendi artists",
  PANDIT: "wedding pandits",
  CHOREOGRAPHER: "wedding choreographers",
  FLORIST: "wedding florists",
  WEDDING_PLANNER: "wedding planners",
  TRANSPORT: "wedding transport",
  OTHER: "wedding vendors",
};

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  location?: { latitude?: number; longitude?: number };
};

export async function discoverVendors(
  query: z.infer<typeof discoveryQuerySchema>,
  weddingLocation: {
    city?: string | null;
    formattedAddress?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  },
) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key)
    throw new WeddingError(
      "NOT_CONFIGURED",
      "Google Places discovery is not configured. You can still add vendors manually.",
      503,
    );
  const locationName =
    query.query || weddingLocation.city || weddingLocation.formattedAddress;
  const lat = query.lat ?? weddingLocation.latitude;
  const lng = query.lng ?? weddingLocation.longitude;
  if (!locationName && (lat == null || lng == null))
    throw new WeddingError(
      "VALIDATION_ERROR",
      "Enter a city to search for vendors.",
      400,
    );
  const body: Record<string, unknown> = {
    textQuery: `${LABELS[query.category]}${locationName ? ` in ${locationName}` : ""}`,
    pageSize: 12,
    languageCode: "en",
  };
  if (lat != null && lng != null && !query.query)
    body.locationBias = {
      circle: { center: { latitude: lat, longitude: lng }, radius: 30000 },
    };
  let response: Response;
  try {
    response = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      },
    );
  } catch {
    throw new WeddingError(
      "PROVIDER_UNAVAILABLE",
      "Vendor search is temporarily unavailable.",
      503,
    );
  }
  if (!response.ok)
    throw new WeddingError(
      "PROVIDER_UNAVAILABLE",
      "Vendor search is temporarily unavailable. Check the Places API setup.",
      503,
    );
  const data = (await response.json()) as { places?: GooglePlace[] };
  return (data.places ?? [])
    .filter((place) => place.id && place.displayName?.text)
    .map((place) => ({
      googlePlaceId: place.id!,
      name: place.displayName!.text!,
      rating: place.rating ?? null,
      ratingCount: place.userRatingCount ?? null,
      address: place.formattedAddress ?? null,
      latitude: place.location?.latitude ?? null,
      longitude: place.location?.longitude ?? null,
      googleMapsUri: `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(place.id!)}`,
    }));
}
