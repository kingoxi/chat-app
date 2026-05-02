import type { MessageMetadata } from "@/types/chat";

export type GifMessageMetadata = {
  type: "gif";
  gifId: string;
  sourceUrl: string;
  previewUrl: string;
  renderUrl: string;
  width: number;
  height: number;
  title: string | null;
};

export type GiphyAnalyticsUrls = {
  onload?: string;
  onclick?: string;
  onsent?: string;
};

export type GiphySearchResult = {
  id: string;
  title: string | null;
  sourceUrl: string;
  previewUrl: string;
  renderUrl: string;
  width: number;
  height: number;
  analytics: GiphyAnalyticsUrls;
};

const GIPHY_HOST_PATTERN =
  /(^|\.)giphy\.com$|(^|\.)giphyusercontent\.com$|(^|\.)gph\.is$/i;
const GIPHY_ID_PATTERN = /(?:\/media\/|\/gifs\/(?:.*-)?)([a-zA-Z0-9]+)(?:[/?#-]|$)/;

function parseDimension(value: string | number | undefined) {
  const numericValue =
    typeof value === "number" ? value : Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return numericValue;
}

export function isGiphyUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return GIPHY_HOST_PATTERN.test(url.hostname);
  } catch {
    return false;
  }
}

export function extractGiphyId(value: string) {
  if (!isGiphyUrl(value)) {
    return null;
  }

  const match = value.trim().match(GIPHY_ID_PATTERN);
  return match?.[1] ?? null;
}

export function buildGiphyMediaUrl(gifId: string) {
  return `https://media.giphy.com/media/${gifId}/giphy.gif`;
}

export function createGifMetadataFromUrl(value: string): GifMessageMetadata | null {
  const gifId = extractGiphyId(value);

  if (!gifId) {
    return null;
  }

  const mediaUrl = buildGiphyMediaUrl(gifId);

  return {
    type: "gif",
    gifId,
    sourceUrl: value.trim(),
    previewUrl: mediaUrl,
    renderUrl: mediaUrl,
    width: 0,
    height: 0,
    title: null,
  };
}

export function mapGiphyApiGif(rawGif: unknown): GiphySearchResult | null {
  if (!rawGif || typeof rawGif !== "object" || Array.isArray(rawGif)) {
    return null;
  }

  const gif = rawGif as {
    id?: unknown;
    title?: unknown;
    url?: unknown;
    images?: {
      fixed_width?: {
        url?: unknown;
        webp?: unknown;
        width?: unknown;
        height?: unknown;
      };
      downsized_medium?: {
        url?: unknown;
        width?: unknown;
        height?: unknown;
      };
      original?: {
        url?: unknown;
        webp?: unknown;
        width?: unknown;
        height?: unknown;
      };
    };
    analytics?: {
      onload?: { url?: unknown };
      onclick?: { url?: unknown };
      onsent?: { url?: unknown };
    };
  };

  if (typeof gif.id !== "string") {
    return null;
  }

  const original = gif.images?.original;
  const downsized = gif.images?.downsized_medium;
  const fixedWidth = gif.images?.fixed_width;
  const previewUrl =
    (typeof fixedWidth?.webp === "string" && fixedWidth.webp) ||
    (typeof fixedWidth?.url === "string" && fixedWidth.url) ||
    (typeof downsized?.url === "string" && downsized.url) ||
    (typeof original?.url === "string" && original.url) ||
    buildGiphyMediaUrl(gif.id);
  const renderUrl =
    (typeof downsized?.url === "string" && downsized.url) ||
    (typeof original?.webp === "string" && original.webp) ||
    (typeof original?.url === "string" && original.url) ||
    previewUrl;

  const sourceUrl =
    typeof gif.url === "string" && gif.url ? gif.url : previewUrl;
  const width =
    parseDimension(fixedWidth?.width as string | number | undefined) ||
    parseDimension(downsized?.width as string | number | undefined) ||
    parseDimension(original?.width as string | number | undefined);
  const height =
    parseDimension(fixedWidth?.height as string | number | undefined) ||
    parseDimension(downsized?.height as string | number | undefined) ||
    parseDimension(original?.height as string | number | undefined);

  return {
    id: gif.id,
    title: typeof gif.title === "string" && gif.title.trim() ? gif.title : null,
    sourceUrl,
    previewUrl,
    renderUrl,
    width,
    height,
    analytics: {
      onload:
        typeof gif.analytics?.onload?.url === "string"
          ? gif.analytics.onload.url
          : undefined,
      onclick:
        typeof gif.analytics?.onclick?.url === "string"
          ? gif.analytics.onclick.url
          : undefined,
      onsent:
        typeof gif.analytics?.onsent?.url === "string"
          ? gif.analytics.onsent.url
          : undefined,
    },
  };
}

export function getGifMessageMetadata(
  metadata: MessageMetadata,
): GifMessageMetadata | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  if (
    metadata.type !== "gif" ||
    typeof metadata.gifId !== "string" ||
    typeof metadata.sourceUrl !== "string" ||
    typeof metadata.previewUrl !== "string" ||
    typeof metadata.renderUrl !== "string" ||
    typeof metadata.width !== "number" ||
    typeof metadata.height !== "number"
  ) {
    return null;
  }

  return metadata as GifMessageMetadata;
}

export function buildGiphyPingbackUrl(baseUrl: string, randomId: string) {
  const url = new URL(baseUrl);
  url.searchParams.set("ts", Date.now().toString());
  url.searchParams.set("random_id", randomId);
  return url.toString();
}
