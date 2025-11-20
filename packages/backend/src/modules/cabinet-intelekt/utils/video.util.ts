import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);
const logger = new Logger('VideoUtil');

export interface VideoMetadata {
  duration: number | null;
  width: number | null;
  height: number | null;
}

/**
 * Generate thumbnail from video using FFmpeg
 * @param videoPath - Path to video file
 * @param thumbnailPath - Output path for thumbnail
 * @param timeOffset - Time offset in seconds for thumbnail capture (default: 1)
 */
export async function generateThumbnail(
  videoPath: string,
  thumbnailPath: string,
  timeOffset: number = 1,
): Promise<void> {
  try {
    logger.debug(`Generating thumbnail: ${videoPath} -> ${thumbnailPath}`);

    // Ensure thumbnail directory exists
    const thumbnailDir = path.dirname(thumbnailPath);
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    // Use FFmpeg to extract frame at specified time
    const command = `ffmpeg -i "${videoPath}" -ss ${timeOffset} -vframes 1 -vf scale=640:-1 "${thumbnailPath}" -y`;

    const { stderr } = await execAsync(command);

    if (stderr && stderr.includes('error')) {
      logger.warn(`FFmpeg warnings: ${stderr}`);
    }

    logger.debug(`Thumbnail generated successfully: ${thumbnailPath}`);
  } catch (error) {
    logger.error(`Failed to generate thumbnail: ${error.message}`);
    throw new Error(`Thumbnail generation failed: ${error.message}`);
  }
}

/**
 * Get video metadata using FFprobe
 * @param videoPath - Path to video file
 */
export async function getVideoMetadata(
  videoPath: string,
): Promise<VideoMetadata> {
  try {
    logger.debug(`Getting video metadata: ${videoPath}`);

    const command = `ffprobe -v error -show_entries format=duration -show_entries stream=width,height -of default=noprint_wrappers=1 "${videoPath}"`;

    const { stdout } = await execAsync(command);

    const lines = stdout.split('\n');
    const metadata: VideoMetadata = {
      duration: null,
      width: null,
      height: null,
    };

    for (const line of lines) {
      if (line.startsWith('duration=')) {
        const durationStr = line.split('=')[1];
        metadata.duration = parseFloat(durationStr);
      } else if (line.startsWith('width=')) {
        const widthStr = line.split('=')[1];
        metadata.width = parseInt(widthStr, 10);
      } else if (line.startsWith('height=')) {
        const heightStr = line.split('=')[1];
        metadata.height = parseInt(heightStr, 10);
      }
    }

    logger.debug(`Video metadata: ${JSON.stringify(metadata)}`);
    return metadata;
  } catch (error) {
    logger.error(`Failed to get video metadata: ${error.message}`);
    // Return null values if metadata extraction fails
    return { duration: null, width: null, height: null };
  }
}

/**
 * Validate video file
 * @param mimetype - MIME type of the file
 */
export function isValidVideoFormat(mimetype: string): boolean {
  const validFormats = [
    'video/mp4',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
  ];

  return validFormats.includes(mimetype);
}
