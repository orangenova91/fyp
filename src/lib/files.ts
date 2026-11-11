import "server-only";
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { FileRecord } from "./data";
import { storage } from "./supabase";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type UploadedFile = Omit<FileRecord, "id" | "created_at" | "owner_id">;

export function pickUploads(formData: FormData, field = "files"): File[] {
  return formData
    .getAll(field)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

export function uploadsTooLarge(files: File[]) {
  return files.reduce((sum, file) => sum + file.size, 0) > MAX_UPLOAD_BYTES;
}

/** Uploads to Supabase Storage; the caller records the returned metadata in the database. */
export async function uploadFiles(
  files: File[],
  ownerType: FileRecord["owner_type"],
): Promise<UploadedFile[]> {
  const uploaded: UploadedFile[] = [];
  try {
    for (const file of files) {
      const storedName = `${ownerType}/${randomUUID()}`;
      const mimeType = file.type || "application/octet-stream";
      const { error } = await storage().upload(storedName, file, { contentType: mimeType });
      if (error) throw new Error(`파일 업로드 실패: ${error.message}`);
      uploaded.push({
        owner_type: ownerType,
        original_name: path.basename(file.name) || "file",
        stored_name: storedName,
        size: file.size,
        mime_type: mimeType,
      });
    }
  } catch (error) {
    await removeStoredFiles(uploaded);
    throw error;
  }
  return uploaded;
}

/** Runs a database write that records the uploads, removing them from Storage if it fails. */
export async function withUploads<T>(uploaded: UploadedFile[], write: () => Promise<T>) {
  try {
    return await write();
  } catch (error) {
    await removeStoredFiles(uploaded);
    throw error;
  }
}

export async function downloadStoredFile(storedName: string) {
  const { data, error } = await storage().download(storedName);
  return error ? null : data;
}

export async function removeStoredFiles(records: Pick<FileRecord, "stored_name">[]) {
  if (records.length === 0) return;
  await storage().remove(records.map((record) => record.stored_name));
}
