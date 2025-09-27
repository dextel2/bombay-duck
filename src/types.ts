export interface BseApiResponse {
  Table?: BseAnnouncement[];
  Table1?: Array<{ ROWCNT: number }>;
}

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

export interface Announcement {
  newsId: string;
  scripCode: number;
  shortName: string;
  headline: string;
  announcedAt: string; // ISO timestamp in IST zone
  url: string;
  rawTime?: string;
}

export interface FetchMeta {
  requestUrl: string;
  tradingDate: string;
  fetchedAt: string;
  retryCount: number;
  throttleWaitMs: number;
  totalAnnouncements: number;
}

export interface FetchSnapshot {
  meta: FetchMeta;
  announcements: Announcement[];
  rawPayloadPath: string;
}

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

export interface RenderRow {
  hourLabel: string;
  company: string;
  code: string;
  headline: string;
  url: string;
  announcedAtLabel: string;
  profitIndicator: string;
}

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
