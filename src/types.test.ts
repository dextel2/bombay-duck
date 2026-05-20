import {
  BseApiResponse,
  BseAnnouncement,
  Announcement,
  FetchMeta,
  FetchSnapshot,
  IntradayState,
  RenderRow,
  RenderContext,
} from './types';

describe('Type Definitions', () => {
  describe('BseApiResponse', () => {
    it('should have optional Table and Table1 properties', () => {
      const response: BseApiResponse = {};
      expect(response).toBeDefined();
      
      const responseWithTable: BseApiResponse = {
        Table: [],
      };
      expect(responseWithTable.Table).toEqual([]);
      
      const responseWithTable1: BseApiResponse = {
        Table1: [{ ROWCNT: 1 }],
      };
      expect(responseWithTable1.Table1).toEqual([{ ROWCNT: 1 }]);
    });
  });

  describe('BseAnnouncement', () => {
    it('should have required properties NEWSID and SCRIP_CD', () => {
      const announcement: BseAnnouncement = {
        NEWSID: '123',
        SCRIP_CD: 12345,
      };
      expect(announcement.NEWSID).toBe('123');
      expect(announcement.SCRIP_CD).toBe(12345);
    });

    it('should have all optional properties', () => {
      const announcement: BseAnnouncement = {
        NEWSID: '123',
        SCRIP_CD: 12345,
        XML_NAME: 'test.xml',
        NEWSSUB: 'Test Subject',
        DT_TM: '2023-09-20T10:00:00',
        NEWS_DT: '2023-09-20',
        CRITICALNEWS: 1,
        ANNOUNCEMENT_TYPE: 'ANNUAL',
        QUARTER_ID: 'Q1',
        FILESTATUS: 'ACTIVE',
        ATTACHMENTNAME: 'attachment.pdf',
        MORE: 'more info',
        HEADLINE: 'Test Headline',
        CATEGORYNAME: 'FINANCIAL',
        OLD: 0,
        RN: 1,
        PDFFLAG: 1,
        NURL: 'https://example.com/nurl',
        NSURL: 'https://example.com/nsurl',
        SLONGNAME: 'Long Company Name',
        AGENDA_ID: 123,
        TotalPageCnt: 1,
        News_submission_dt: '2023-09-20T09:00:00',
        DissemDT: '2023-09-20T10:00:00',
        TimeDiff: '1h',
        Fld_Attachsize: 1024,
        SUBCATNAME: 'SUBCATEGORY',
        AUDIO_VIDEO_FILE: undefined,
      };
      
      expect(announcement.XML_NAME).toBe('test.xml');
      expect(announcement.NEWSSUB).toBe('Test Subject');
      expect(announcement.DT_TM).toBe('2023-09-20T10:00:00');
      expect(announcement.NEWS_DT).toBe('2023-09-20');
      expect(announcement.CRITICALNEWS).toBe(1);
      expect(announcement.ANNOUNCEMENT_TYPE).toBe('ANNUAL');
      expect(announcement.QUARTER_ID).toBe('Q1');
      expect(announcement.FILESTATUS).toBe('ACTIVE');
      expect(announcement.ATTACHMENTNAME).toBe('attachment.pdf');
      expect(announcement.MORE).toBe('more info');
      expect(announcement.HEADLINE).toBe('Test Headline');
      expect(announcement.CATEGORYNAME).toBe('FINANCIAL');
      expect(announcement.OLD).toBe(0);
      expect(announcement.RN).toBe(1);
      expect(announcement.PDFFLAG).toBe(1);
      expect(announcement.NURL).toBe('https://example.com/nurl');
      expect(announcement.NSURL).toBe('https://example.com/nsurl');
      expect(announcement.SLONGNAME).toBe('Long Company Name');
      expect(announcement.AGENDA_ID).toBe(123);
      expect(announcement.TotalPageCnt).toBe(1);
      expect(announcement.News_submission_dt).toBe('2023-09-20T09:00:00');
      expect(announcement.DissemDT).toBe('2023-09-20T10:00:00');
      expect(announcement.TimeDiff).toBe('1h');
      expect(announcement.Fld_Attachsize).toBe(1024);
      expect(announcement.SUBCATNAME).toBe('SUBCATEGORY');
      expect(announcement.AUDIO_VIDEO_FILE).toBeUndefined();
    });
  });

  describe('Announcement', () => {
    it('should have required properties', () => {
      const announcement: Announcement = {
        newsId: '123',
        scripCode: 12345,
        shortName: 'ABC Ltd',
        headline: 'Quarterly Results',
        announcedAt: '2023-09-20T10:00:00.000Z',
        url: 'https://example.com/announcement/123',
      };
      
      expect(announcement.newsId).toBe('123');
      expect(announcement.scripCode).toBe(12345);
      expect(announcement.shortName).toBe('ABC Ltd');
      expect(announcement.headline).toBe('Quarterly Results');
      expect(announcement.announcedAt).toBe('2023-09-20T10:00:00.000Z');
      expect(announcement.url).toBe('https://example.com/announcement/123');
    });

    it('can have optional rawTime property', () => {
      const announcement: Announcement = {
        newsId: '123',
        scripCode: 12345,
        shortName: 'ABC Ltd',
        headline: 'Quarterly Results',
        announcedAt: '2023-09-20T10:00:00.000Z',
        url: 'https://example.com/announcement/123',
        rawTime: '2023-09-20 10:00:00',
      };
      
      expect(announcement.rawTime).toBe('2023-09-20 10:00:00');
    });
  });

  describe('FetchMeta', () => {
    it('should have all required properties', () => {
      const meta: FetchMeta = {
        requestUrl: 'https://api.example.com/announcements',
        tradingDate: '2023-09-20',
        fetchedAt: '2023-09-20T10:05:00.000Z',
        retryCount: 0,
        throttleWaitMs: 1000,
        totalAnnouncements: 125,
      };
      
      expect(meta.requestUrl).toBe('https://api.example.com/announcements');
      expect(meta.tradingDate).toBe('2023-09-20');
      expect(meta.fetchedAt).toBe('2023-09-20T10:05:00.000Z');
      expect(meta.retryCount).toBe(0);
      expect(meta.throttleWaitMs).toBe(1000);
      expect(meta.totalAnnouncements).toBe(125);
    });
  });

  describe('FetchSnapshot', () => {
    it('should have meta and announcements properties', () => {
      const snapshot: FetchSnapshot = {
        meta: {
          requestUrl: 'https://api.example.com/announcements',
          tradingDate: '2023-09-20',
          fetchedAt: '2023-09-20T10:05:00.000Z',
          retryCount: 0,
          throttleWaitMs: 1000,
          totalAnnouncements: 125,
        },
        announcements: [
          {
            newsId: '123',
            scripCode: 12345,
            shortName: 'ABC Ltd',
            headline: 'Quarterly Results',
            announcedAt: '2023-09-20T10:00:00.000Z',
            url: 'https://example.com/announcement/123',
          }
        ],
        rawPayloadPath: '/path/to/raw/payload.json',
      };
      
      expect(snapshot.meta.requestUrl).toBe('https://api.example.com/announcements');
      expect(snapshot.announcements.length).toBe(1);
      expect(snapshot.rawPayloadPath).toBe('/path/to/raw/payload.json');
    });
  });

  describe('IntradayState', () => {
    it('should have expected structure with buckets as record', () => {
      const state: IntradayState = {
        tradingDate: '2023-09-20',
        buckets: {
          '2023-09-20T10': [
            {
              newsId: '123',
              scripCode: 12345,
              shortName: 'ABC Ltd',
              headline: 'Quarterly Results',
              announcedAt: '2023-09-20T10:00:00.000Z',
              url: 'https://example.com/announcement/123',
            }
          ],
        },
        meta: {
          lastUpdated: '2023-09-20T10:05:00.000Z',
          checksum: 'abc123checksum',
          totalAnnouncements: 125,
          requestCount: 3,
          retryCount: 0,
          rawPayloadPath: '/path/to/raw/payload.json',
        },
      };
      
      expect(state.tradingDate).toBe('2023-09-20');
      expect(state.buckets['2023-09-20T10']).toBeDefined();
      expect(state.buckets['2023-09-20T10'].length).toBe(1);
      expect(state.meta.lastUpdated).toBe('2023-09-20T10:05:00.000Z');
      expect(state.meta.checksum).toBe('abc123checksum');
      expect(state.meta.totalAnnouncements).toBe(125);
      expect(state.meta.requestCount).toBe(3);
      expect(state.meta.retryCount).toBe(0);
      expect(state.meta.rawPayloadPath).toBe('/path/to/raw/payload.json');
    });
  });

  describe('RenderRow', () => {
    it('should have all required properties', () => {
      const row: RenderRow = {
        hourLabel: '10:00 AM',
        company: 'ABC Ltd',
        code: '12345',
        headline: 'Quarterly Results',
        url: 'https://example.com/announcement/123',
        announcedAtLabel: '10:00 AM',
        profitIndicator: 'P',
      };
      
      expect(row.hourLabel).toBe('10:00 AM');
      expect(row.company).toBe('ABC Ltd');
      expect(row.code).toBe('12345');
      expect(row.headline).toBe('Quarterly Results');
      expect(row.url).toBe('https://example.com/announcement/123');
      expect(row.announcedAtLabel).toBe('10:00 AM');
      expect(row.profitIndicator).toBe('P');
    });
  });

  describe('RenderContext', () => {
    it('should have expected properties', () => {
      const context: RenderContext = {
        tradingDate: '2023-09-20',
        tradingDateDisplay: 'September 20, 2023',
        hasAnnouncements: true,
        announcementCount: 125,
        requestCount: 3,
        retryCount: 0,
        lastUpdatedDisplay: '10:05 AM',
        stateFileName: 'state.json',
        rows: [
          {
            hourLabel: '10:00 AM',
            company: 'ABC Ltd',
            code: '12345',
            headline: 'Quarterly Results',
            url: 'https://example.com/announcement/123',
            announcedAtLabel: '10:00 AM',
            profitIndicator: 'P',
          }
        ],
      };
      
      expect(context.tradingDate).toBe('2023-09-20');
      expect(context.tradingDateDisplay).toBe('September 20, 2023');
      expect(context.hasAnnouncements).toBe(true);
      expect(context.announcementCount).toBe(125);
      expect(context.requestCount).toBe(3);
      expect(context.retryCount).toBe(0);
      expect(context.lastUpdatedDisplay).toBe('10:05 AM');
      expect(context.stateFileName).toBe('state.json');
      expect(context.rows.length).toBe(1);
    });
  });
});