"use server";

import { STANDARD_DPI } from "@/features/dashboard/shared/constants/paper";
import type { Certificate } from "@/types";
import { jsPDF } from "jspdf";
import type { Databases, Storage } from "node-appwrite";
import sharp from "sharp";
import type {
  CertificateFile,
  CertificateFileResponse,
  CertificateMetadata,
} from "../shared/types";
import { sanitizeFilename, withCache, withRetry } from "../shared/utils";

async function _fetchCertificateMetadata(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  certificateId: string,
  format: string,
): Promise<CertificateMetadata> {
  return await withRetry({
    fn: async () => {
      const certificate: Certificate = await databases.getDocument({
        databaseId,
        collectionId,
        documentId: certificateId,
      });
      return {
        recipient: certificate.recipientFullName,
        filename: `${sanitizeFilename(certificate.recipientFullName)}.${format}`,
        fileId: certificate.fileId,
      };
    },
  });
}

const fetchCertificateMetadata = withCache({
  fn: _fetchCertificateMetadata,
  revalidate: 300,
  keyPartsGenerator: (
    _databases,
    _databaseId,
    _collectionId,
    certificateId,
    format,
  ) => ["certificate-metadata", certificateId, format],
  staticTag: "certificate-metadata",
});

async function _fetchCertificateFile(
  storage: Storage,
  metadata: CertificateMetadata,
  bucketId: string,
  format: string,
): Promise<CertificateFile> {
  return await withRetry({
    fn: async () => {
      // Fetch file buffer (not cached)
      const fileBuffer = await storage.getFileDownload({
        bucketId,
        fileId: metadata.fileId,
      });
      let convertedBuffer: Buffer<ArrayBufferLike> = Buffer.from(fileBuffer);

      if (format === "jpg" || format === "jpeg") {
        convertedBuffer = await sharp(convertedBuffer)
          .jpeg({ quality: 80 })
          .toBuffer();
      } else if (format === "pdf") {
        // Resize and compress image with sharp
        const image = sharp(convertedBuffer);
        const imgMetadata = await image.metadata();

        // Resize to a maximum width of 1920px, maintaining aspect ratio
        const targetWidth = 1920;
        const scaleFactor = Math.min(1, targetWidth / imgMetadata.width!);
        const targetHeight = Math.round(imgMetadata.height! * scaleFactor);

        // Convert to JPEG and compress
        const compressedBuffer = await image
          .resize({ width: targetWidth, height: targetHeight })
          .jpeg({ quality: 80 }) // Compress to JPEG with 80% quality
          .toBuffer();

        // Create PDF with scaled dimensions (assuming 150 DPI)
        const dpi = STANDARD_DPI;
        const pdfWidth = (targetWidth / dpi) * 72; // Convert pixels to points (1 inch = 72 points)
        const pdfHeight = (targetHeight / dpi) * 72;

        const pdf = new jsPDF({
          orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
          unit: "pt",
          format: [pdfWidth, pdfHeight],
          compress: true, // Enable PDF compression
        });

        const base64 = compressedBuffer.toString("base64");
        pdf.addImage(
          `data:image/jpeg;base64,${base64}`, // Use JPEG instead of PNG
          "JPEG",
          0,
          0,
          pdfWidth,
          pdfHeight,
        );

        convertedBuffer = Buffer.from(pdf.output("arraybuffer"));
      }

      const arrayBuffer = convertedBuffer.buffer.slice(
        convertedBuffer.byteOffset,
        convertedBuffer.byteOffset + convertedBuffer.byteLength,
      );

      return { fileBuffer: arrayBuffer, filename: metadata.filename };
    },
  });
}

export async function getCertificateFiles(
  storage: Storage,
  databases: Databases,
  databaseId: string,
  collectionId: string,
  certificateId: string,
  bucketId: string,
  format: string,
): Promise<CertificateFileResponse> {
  try {
    // Fetch metadata (cached, with retries)
    const metadata = await fetchCertificateMetadata(
      databases,
      databaseId,
      collectionId,
      certificateId,
      format,
    );

    // Fetch file buffer (not cached, with retries)
    const res = await _fetchCertificateFile(
      storage,
      metadata,
      bucketId,
      format,
    );

    if (!res) {
      throw new Error("File not found");
    }

    return { ok: true, data: res };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch certificate";
    return { ok: false, error: message };
  }
}
