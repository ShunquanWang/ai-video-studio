import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {ALL_FORMATS, FilePathSource, Input} from 'mediabunny';
import {ZodError} from 'zod';
import {parseReportVideo} from '../src/schemas/report-video';

const [videoFile, tracksFile] = process.argv.slice(2);
if (!videoFile || !tracksFile) {
  console.error('Usage: npm run validate:report -- <video.json> <captions.json>');
  process.exit(1);
}

const validate = async () => {
try {
  const video = JSON.parse(readFileSync(videoFile, 'utf8')) as unknown;
  const tracks = JSON.parse(readFileSync(tracksFile, 'utf8')) as unknown;
  const parsed = parseReportVideo({...video as object, tracks});
  const audioFile = resolve('public', parsed.audioPath);
  const input = new Input({source: new FilePathSource(audioFile), formats: ALL_FORMATS});
  if (!await input.getPrimaryAudioTrack()) throw new Error('Audio track is missing');
  const seconds = await input.computeDuration();
  const configuredSeconds = parsed.audioEndFrame / 30;
  if (seconds < configuredSeconds - 0.1 || seconds > configuredSeconds + 0.5)
    throw new Error(`Audio duration ${seconds.toFixed(2)}s differs from configured ` +
      `${configuredSeconds.toFixed(2)}s; trim the audio or fix audioEndFrame`);
  console.log(`Valid report video: ${parsed.scenes.length} scenes, ` +
    `${seconds.toFixed(2)}s audio, ` +
    `${((parsed.introFrames + parsed.scenes.reduce((sum, scene) =>
      sum + scene.duration, 0)) / 30).toFixed(2)}s timeline`);
} catch (error) {
  if (error instanceof ZodError) {
    for (const issue of error.issues) console.error(`${issue.path.join('.')}: ${issue.message}`);
  } else console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
};

void validate();
