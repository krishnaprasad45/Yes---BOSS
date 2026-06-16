/** Photo/video backup (Phase 6 — iOS & Android capture). */

export type MediaType = "photo" | "video";

export interface MediaAsset {
  id: string;
  type: MediaType;
  /** Short-lived presigned URL to fetch the asset. */
  url: string;
  sourceFileName: string;
  sizeBytes: number;
  capturedAt: string;
  createdAt: string;
}

/** Multipart fields sent alongside a media upload. */
export interface UploadMediaMeta {
  type: MediaType;
  sourceFileName: string;
  capturedAt: string;
  /** Device-stable key so re-syncing the gallery never duplicates. */
  dedupeKey: string;
}

export interface MediaListParams {
  page?: number;
  limit?: number;
  type?: MediaType;
}
