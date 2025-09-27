/**
 * Shared TypeScript interfaces that describe the shape of BSE responses and
 * the data exchanged across scripts.
 */
export interface BseApiResponse {
  Table?: BseAnnouncement[];
  Table1?: Array<{ ROWCNT: number }>;
}

/** Raw announcement record returned by the BSE API. */
export interface BseAnnouncement {
  NEWSID: string;
  SCRIP_CD: number;
  XML_NAME?: string;
  NEWSSUB?: string;
  DT_TM?: string;
  NEWS_DT?: string;
  CRITICALNEWS?: number;
  ANNOUNCEMENT_TYPE?: string;
  QUARTER_ID?: unknown;
  FILESTATUS?: string;
  ATTACHMENTNAME?: string;
  MORE?: string;
  HEADLINE?: string;
  CATEGORYNAME?: string;
  OLD?: number;
  RN?: number;
  PDFFLAG?: number;
  NURL?: string;
  NSURL?: string;
  SLONGNAME?: string;
  AGENDA_ID?: number;
  TotalPageCnt?: number;
  News_submission_dt?: string;
  DissemDT?: string;
  TimeDiff?: string;
  Fld_Attachsize?: number;
  SUBCATNAME?: string;
  AUDIO_VIDEO_FILE?: unknown;
}

/** Normalised announcement stored in the repository. */
export interface Announcement {
  newsId: string;
  scripCode: number;
  shortName: string;
  headline: string;
  announcedAt: string; // ISO timestamp in IST zone
  url: string;
  rawTime?: string;
}

/** Metadata captured every time the fetch script runs. */
export interface FetchMeta {
  requestUrl: string;
  tradingDate: string;
  fetchedAt: string;
  retryCount: number;
  throttleWaitMs: number;
  totalAnnouncements: number;
}

/** Snapshot persisted after each fetch so other steps can reuse the payload. */
export interface FetchSnapshot {
  meta: FetchMeta;
  announcements: Announcement[];
  rawPayloadPath: string;
}

/** Intraday state written to disk and rendered into the README. */
export interface IntradayState {
  tradingDate: string;
  buckets: Record<string, Announcement[]>; // key is hour iso string (yyyy-LL-ddTHH)
  meta: {
    lastUpdated: string;
    checksum: string;
    totalAnnouncements: number;
    requestCount: number;
    retryCount: number;
    rawPayloadPath: string;
  };
}

/** Row rendered into the README table. */
export interface RenderRow {
  hourLabel: string;
  company: string;
  code: string;
  headline: string;
  url: string;
  announcedAtLabel: string;
  profitIndicator: string;
}

/** Context fed into the Mustache template to build the intraday snapshot. */
export interface RenderContext {
  tradingDate: string;
  tradingDateDisplay: string;
  hasAnnouncements: boolean;
  announcementCount: number;
  requestCount: number;
  retryCount: number;
  lastUpdatedDisplay: string;
  stateFileName: string;
  rows: RenderRow[];
}
