import { DEFAULT_BACKGROUND_VOLUME, DEFAULT_INSTRUMENT_FOR_ROLE, INITIAL_PROGRESS } from '../core/constants.ts';
import type { AppState, GeneratedPart, ParsedMidi, ParsedTrack, PartRole, ProgressState, TrackConfig } from '../core/types.ts';

function createDefaultPartNames(): AppState['partNames'] {
  return {
    Soprano: 'Soprano',
    Alto: 'Alto',
    Tenor: 'Tenor',
    Bass: 'Bass',
    Piano: 'Piano',
  };
}

function inferRole(track: ParsedTrack): PartRole {
  const name = track.name.toLowerCase();
  if (name.includes('soprano') || name.includes('sop')) return 'Soprano';
  if (name.includes('alto') || name.includes('alt')) return 'Alto';
  if (name.includes('tenor') || name.includes('ten')) return 'Tenor';
  if (name.includes('bass') || name.includes('bas')) return 'Bass';
  if (name.includes('piano') || name.includes('伴奏') || name.includes('accomp')) return 'Piano';
  if (track.channel === 9 || track.instrumentNumber === 115) return 'Excluded';
  return 'Excluded';
}

function inferInstrument(track: ParsedTrack, role: PartRole): TrackConfig['instrument'] {
  if (track.channel === 9 || track.instrumentNumber === 115) {
    return 'woodblock';
  }
  return DEFAULT_INSTRUMENT_FOR_ROLE[role];
}

export function createDefaultTrackConfigs(parsedMidi: ParsedMidi): TrackConfig[] {
  return parsedMidi.tracks.map((track) => {
    const role = inferRole(track);
    return {
      trackId: track.id,
      role,
      instrument: inferInstrument(track, role),
    };
  });
}

export function createInitialAppState(): AppState {
  return {
    parsedMidi: null,
    trackConfigs: [],
    partNames: createDefaultPartNames(),
    backgroundVolumePercent: DEFAULT_BACKGROUND_VOLUME,
    progress: { ...INITIAL_PROGRESS },
    generatedParts: [],
  };
}

export function setParsedMidi(state: AppState, parsedMidi: ParsedMidi): AppState {
  return {
    ...state,
    parsedMidi,
    trackConfigs: createDefaultTrackConfigs(parsedMidi),
    partNames: createDefaultPartNames(),
    progress: { ...INITIAL_PROGRESS },
    generatedParts: [],
  };
}

export function updateTrackConfig(state: AppState, trackId: number, patch: Partial<Omit<TrackConfig, 'trackId'>>): AppState {
  return {
    ...state,
    trackConfigs: state.trackConfigs.map((config) => (
      config.trackId === trackId
        ? { ...config, ...patch, trackId: config.trackId }
        : config
    )),
  };
}

export function setBackgroundVolume(state: AppState, percent: number): AppState {
  const clamped = Math.max(0, Math.min(100, percent));
  return {
    ...state,
    backgroundVolumePercent: clamped,
  };
}

export function setPartName(state: AppState, role: Exclude<PartRole, 'Excluded'>, name: string): AppState {
  const trimmed = name.trim();
  return {
    ...state,
    partNames: {
      ...state.partNames,
      [role]: trimmed.length > 0 ? trimmed : role,
    },
  };
}

export function setProgress(state: AppState, progressPatch: Partial<ProgressState>): AppState {
  return {
    ...state,
    progress: {
      ...state.progress,
      ...progressPatch,
    },
  };
}

export function addGeneratedPart(state: AppState, part: GeneratedPart): AppState {
  return {
    ...state,
    generatedParts: [...state.generatedParts, part],
  };
}

export function resetGeneration(state: AppState): AppState {
  return {
    ...state,
    progress: { ...INITIAL_PROGRESS },
    generatedParts: [],
  };
}
