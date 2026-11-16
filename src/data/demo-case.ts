// The Quarrow Velloch Group: a wholly fictional demonstration case.
// Every entity, person, date, domain and record here is invented and carries mark S.
// PSC rows give an effective date because the fictional source is the filing itself, which
// states when control began or ended. The live Companies House API does not: its notified_on
// and ceased_on are notification dates, so live rows carry them as recorded dates only.
// Names were checked against public search results on 16 Nov 2026 for collisions
// with real UK companies or people; reserved .example domains are used throughout.

import type { Contra, DayBookEntry, Entity, Evidence, Relationship, Source } from '@/lib/types';

export const DEMO_CLOCK = '2026-11-14T09:00:00Z';
export const CASE_ID = 'quarrow-velloch';
export const CASE_NAME = 'Quarrow Velloch Group';

export const sources: Record<string, Source> = {
  ch: { id: 'ch', name: 'Companies House (demo register)', reliability: 'statutory', freshHours: 24 },
  'ch-mirror': { id: 'ch-mirror', name: 'Register aggregator (demo)', reliability: 'secondary', mirrorOf: 'ch', freshHours: 168 },
  gazette: { id: 'gazette', name: 'The Gazette (demo notice)', reliability: 'official', freshHours: 720 },
  rdap: { id: 'rdap', name: 'Domain registry RDAP (demo)', reliability: 'official', freshHours: 168 },
  web: { id: 'web', name: 'Company website snapshot', reliability: 'self-published', freshHours: 2160 },
  archive: { id: 'archive', name: 'Web archive snapshot (demo)', reliability: 'secondary', freshHours: 2160 },
  news: { id: 'news', name: 'Severn Business Post (fictional)', reliability: 'secondary', freshHours: 8760 },
  sanctions: {
    id: 'sanctions',
    name: 'UK Sanctions List (fictional extract)',
    reliability: 'statutory',
    freshHours: 168,
    licence: 'Fictional extract modelled on the FCDO list format',
  },
  hmlr: {
    id: 'hmlr',
    name: 'Land ownership dataset (fictional sample)',
    reliability: 'official',
    freshHours: 24 * 45,
    licence: 'Fictional sample modelled on HMLR company ownership data',
  },
};

const S = 'S' as const;

export const entities: Record<string, Entity> = {
  DM000101: {
    id: 'DM000101', kind: 'company', name: 'Quarrow Velloch Holdings Ltd', number: 'DM000101', status: 'active',
    companyType: 'Private limited company', incorporated: '2015-03-24',
    registeredOffice: 'Wharf House, 14 Narrow Quay, Bristol BS1 4QA', sic: ['70100 Activities of head offices'], mark: S,
  },
  DM000102: {
    id: 'DM000102', kind: 'company', name: 'Velloch Precision Ltd', number: 'DM000102', status: 'active',
    companyType: 'Private limited company', incorporated: '2011-06-02',
    registeredOffice: 'Unit 7, Holbeck Works, Water Lane, Leeds LS11 5QN', sic: ['25620 Machining'], mark: S,
  },
  DM000103: {
    id: 'DM000103', kind: 'company', name: 'QV Estates (Severn) Ltd', number: 'DM000103', status: 'active',
    companyType: 'Private limited company', incorporated: '2019-02-20',
    registeredOffice: 'Quayside Chambers, 3 Commercial Road, Gloucester GL1 2EB', sic: ['68209 Other letting and operating of own or leased real estate'], mark: S,
  },
  DM000104: {
    id: 'DM000104', kind: 'company', name: 'Tarnwick Marine Services Ltd', number: 'DM000104', status: 'dissolved',
    companyType: 'Private limited company', incorporated: '2016-03-01', dissolved: '2024-02-13',
    registeredOffice: 'Dock Road Yard, Cattedown, Plymouth PL4 0RW', sic: ['33150 Repair and maintenance of ships and boats'], mark: S,
  },
  DM000105: {
    id: 'DM000105', kind: 'llp', name: 'Hethermoor Trading LLP', number: 'DM000105', status: 'active',
    companyType: 'Limited liability partnership', incorporated: '2018-01-10',
    registeredOffice: 'Wharf House, 14 Narrow Quay, Bristol BS1 4QA', sic: [], mark: S,
  },
  'P-OM': { id: 'P-OM', kind: 'person', name: 'Odile Marchbanks', mark: S },
  'P-TQH': { id: 'P-TQH', kind: 'person', name: 'Teodor Quill-Hartley', mark: S },
  'P-IS': { id: 'P-IS', kind: 'person', name: 'Imelda Sorrensby', mark: S },
  'P-CW': { id: 'P-CW', kind: 'person', name: 'Caspar Whitlenge', mark: S },
};

export const companyIds = ['DM000101', 'DM000102', 'DM000103', 'DM000104', 'DM000105'];

// --- Evidence -------------------------------------------------------------

type EvInput = Omit<Evidence, 'mark' | 'status' | 'match' | 'retrieved'> &
  Partial<Pick<Evidence, 'status' | 'match' | 'retrieved'>>;

const CH_RETRIEVED = '2026-11-14T08:42:00Z';
const CH_RETRIEVED_OLDER = '2026-11-12T10:05:00Z';

function ev(e: EvInput): Evidence {
  return { mark: S, status: 'current', match: 'exact-id', retrieved: CH_RETRIEVED, ...e };
}
const chUrl = (n: string, path = '') => `https://register.example/company/${n}${path}`;

export const evidence: Evidence[] = [
  // Quarrow Velloch Holdings Ltd
  ev({ id: 'E-001', entityId: 'DM000101', factKey: 'DM000101:name', claim: 'Registered name', value: 'Quarrow Velloch Holdings Ltd', sourceId: 'ch', folio: 'CH·profile·DM000101', url: chUrl('DM000101'), effective: '2015-03-24', recorded: '2015-03-24' }),
  ev({ id: 'E-002', entityId: 'DM000101', factKey: 'DM000101:status', claim: 'Company status', value: 'Active', sourceId: 'ch', folio: 'CH·profile·DM000101', url: chUrl('DM000101') }),
  ev({ id: 'E-003', entityId: 'DM000101', factKey: 'DM000101:incorporated', claim: 'Incorporated', value: '24 Mar 2015', sourceId: 'ch', folio: 'CH·profile·DM000101', url: chUrl('DM000101'), effective: '2015-03-24', recorded: '2015-03-24' }),
  ev({ id: 'E-004', entityId: 'DM000101', factKey: 'DM000101:office', claim: 'Registered office', value: 'Wharf House, 14 Narrow Quay, Bristol BS1 4QA', sourceId: 'ch', folio: 'CH·registered-office·DM000101', url: chUrl('DM000101', '/registered-office-address'), effective: '2019-11-04', recorded: '2019-11-06' }),
  ev({ id: 'E-005', entityId: 'DM000101', factKey: 'DM000101:office', claim: 'Registered office', value: 'Wharf House 14 Narrow Quay Bristol BS1 4QA', sourceId: 'ch-mirror', folio: 'AGG·DM000101', url: 'https://aggregator.example/DM000101', retrieved: '2026-11-13T22:10:00Z', excerpt: 'WHARF HOUSE 14 NARROW QUAY BRISTOL BS1 4QA' }),
  ev({ id: 'E-006', entityId: 'DM000101', factKey: 'DM000101:sic', claim: 'Nature of business (SIC)', value: '70100 Activities of head offices', sourceId: 'ch', folio: 'CH·profile·DM000101', url: chUrl('DM000101') }),
  ev({ id: 'E-007', entityId: 'DM000101', factKey: 'DM000101:psc:P-OM', claim: 'Person with significant control', value: 'Odile Marchbanks: ownership of shares, 75% or more', sourceId: 'ch', folio: 'CH·psc·DM000101·1', url: chUrl('DM000101', '/persons-with-significant-control'), effective: '2016-04-06', recorded: '2016-06-30' }),
  ev({ id: 'E-008', entityId: 'DM000101', factKey: 'DM000101:officer:P-OM', claim: 'Director appointed', value: 'Odile Marchbanks, director', sourceId: 'ch', folio: 'CH·officers·DM000101·1', url: chUrl('DM000101', '/officers'), effective: '2015-03-24', recorded: '2015-03-24' }),
  ev({ id: 'E-009', entityId: 'DM000101', factKey: 'DM000101:officer:P-IS', claim: 'Secretary appointed', value: 'Imelda Sorrensby, secretary', sourceId: 'ch', folio: 'CH·officers·DM000101·2', url: chUrl('DM000101', '/officers'), effective: '2019-11-04', recorded: '2019-11-11' }),
  ev({ id: 'E-010', entityId: 'DM000101', factKey: 'DM000101:accounts-due', claim: 'Next accounts due', value: '31 Dec 2026', sourceId: 'ch', folio: 'CH·profile·DM000101', url: chUrl('DM000101') }),

  // Velloch Precision Ltd
  ev({ id: 'E-020', entityId: 'DM000102', factKey: 'DM000102:name', claim: 'Registered name', value: 'Velloch Precision Ltd', sourceId: 'ch', folio: 'CH·profile·DM000102', url: chUrl('DM000102'), effective: '2011-06-02', recorded: '2011-06-02' }),
  ev({ id: 'E-021', entityId: 'DM000102', factKey: 'DM000102:name', claim: 'Registered name', value: 'VELLOCH PRECISION LIMITED', sourceId: 'ch-mirror', folio: 'AGG·DM000102', url: 'https://aggregator.example/DM000102', retrieved: '2026-11-13T22:10:00Z' }),
  ev({ id: 'E-022', entityId: 'DM000102', factKey: 'DM000102:status', claim: 'Company status', value: 'Active', sourceId: 'ch', folio: 'CH·profile·DM000102', url: chUrl('DM000102') }),
  ev({ id: 'E-023', entityId: 'DM000102', factKey: 'DM000102:incorporated', claim: 'Incorporated', value: '2 Jun 2011', sourceId: 'ch', folio: 'CH·profile·DM000102', url: chUrl('DM000102'), effective: '2011-06-02', recorded: '2011-06-02' }),
  ev({ id: 'E-024', entityId: 'DM000102', factKey: 'DM000102:office', claim: 'Registered office', value: 'Unit 7, Holbeck Works, Water Lane, Leeds LS11 5QN', sourceId: 'ch', folio: 'CH·registered-office·DM000102', url: chUrl('DM000102', '/registered-office-address') }),
  ev({ id: 'E-025', entityId: 'DM000102', factKey: 'DM000102:psc:DM000105', claim: 'Person with significant control (ceased)', value: 'Hethermoor Trading LLP: ownership of shares, 75% or more', sourceId: 'ch', folio: 'CH·psc·DM000102·1', url: chUrl('DM000102', '/persons-with-significant-control'), effective: '2018-01-10', recorded: '2018-02-02', status: 'historical', excerpt: 'Hethermoor Trading LLP. Became a person with significant control on 10 January 2018 and ceased on 3 June 2026, as stated on the filings. Cessation notified to Companies House on 19 June 2026. Nature of control: ownership of shares, 75% or more.' }),
  ev({ id: 'E-026', entityId: 'DM000102', factKey: 'DM000102:owner', claim: 'Person with significant control', value: 'Quarrow Velloch Holdings Ltd', sourceId: 'ch', folio: 'CH·psc·DM000102·2', url: chUrl('DM000102', '/persons-with-significant-control'), effective: '2026-06-03', recorded: '2026-06-19', excerpt: 'Quarrow Velloch Holdings Ltd. Became a person with significant control on 3 June 2026, as stated on the filing. Notified to Companies House on 19 June 2026. Nature of control: ownership of shares, 75% or more.' }),
  ev({ id: 'E-027', entityId: 'DM000102', factKey: 'DM000102:owner', claim: 'Parent company named on website', value: 'Hethermoor Trading LLP', sourceId: 'web', folio: 'WEB·velloch-precision.example/about', url: 'https://velloch-precision.example/about', retrieved: '2026-10-14T16:20:00Z', match: 'attribute', excerpt: 'Velloch Precision is part of the Hethermoor Trading group, our parent since 2018.' }),
  ev({ id: 'E-028', entityId: 'DM000102', factKey: 'DM000102:owner', claim: 'Owner reported in news', value: 'Quarrow Velloch Holdings Ltd', sourceId: 'news', folio: 'SBP·2026-06-24·p4', url: 'https://severnpost.example/2026/06/24/quarrow-velloch-reorganisation', effective: '2026-06-03', recorded: '2026-06-24', retrieved: '2026-11-14T08:50:00Z', match: 'attribute', excerpt: 'Quarrow Velloch Holdings has taken direct ownership of Velloch Precision, the Leeds machining business, in an internal reorganisation completed this month.' }),
  ev({ id: 'E-029', entityId: 'DM000102', factKey: 'DM000102:officer:P-OM', claim: 'Director appointed', value: 'Odile Marchbanks, director', sourceId: 'ch', folio: 'CH·officers·DM000102·1', url: chUrl('DM000102', '/officers'), effective: '2015-04-01', recorded: '2015-04-08' }),
  ev({ id: 'E-030', entityId: 'DM000102', factKey: 'DM000102:officer:P-TQH', claim: 'Director appointed', value: 'Teodor Quill-Hartley, director', sourceId: 'ch', folio: 'CH·officers·DM000102·2', url: chUrl('DM000102', '/officers'), effective: '2017-09-18', recorded: '2017-09-25' }),
  ev({ id: 'E-031', entityId: 'DM000102', factKey: 'DM000102:domain', claim: 'Domain registrant organisation', value: 'Velloch Precision Ltd', sourceId: 'rdap', folio: 'RDAP·velloch-precision.example', url: 'https://rdap.example/domain/velloch-precision.example', effective: '2023-05-02', recorded: '2023-05-02', match: 'attribute', excerpt: 'Registrant organisation: Velloch Precision Ltd. Registered 2023-05-02. Registrant contact: redacted for privacy.' }),
  ev({ id: 'E-032', entityId: 'DM000102', factKey: 'DM000102:old-domain', claim: 'Former domain redirects', value: 'vellochprecision.example redirects to velloch-precision.example', sourceId: 'archive', folio: 'ARC·vellochprecision.example·20230611', url: 'https://archive.example/20230611/vellochprecision.example', effective: '2023-06-11', recorded: '2023-06-11', match: 'attribute', status: 'historical', excerpt: 'HTTP 301 Moved Permanently. Location: https://velloch-precision.example/' }),
  ev({ id: 'E-033', entityId: 'DM000102', factKey: 'DM000102:sanctions:P-TQH', claim: 'Officer screened against UK Sanctions List', value: 'No match', sourceId: 'sanctions', folio: 'UKSL·screen·P-TQH', url: 'https://sanctions.example/screen/P-TQH', retrieved: '2026-11-14T08:55:00Z', datasetDate: '2026-11-11', match: 'attribute', excerpt: 'Subject screened: Teodor Quill-Hartley, officer of Velloch Precision Ltd. Closest candidate: QUILL-HARTEN, Teodors (fictional entry FX-0193). Rejected: different year of birth (1971 against 1984) and different nationality.' }),
  ev({ id: 'E-034', entityId: 'DM000102', factKey: 'DM000102:accounts-due', claim: 'Next accounts due', value: '28 Feb 2027', sourceId: 'ch', folio: 'CH·profile·DM000102', url: chUrl('DM000102') }),

  // QV Estates (Severn) Ltd
  ev({ id: 'E-040', entityId: 'DM000103', factKey: 'DM000103:name', claim: 'Registered name', value: 'QV Estates (Severn) Ltd', sourceId: 'ch', folio: 'CH·profile·DM000103', url: chUrl('DM000103'), effective: '2019-02-20', recorded: '2019-02-20' }),
  ev({ id: 'E-041', entityId: 'DM000103', factKey: 'DM000103:status', claim: 'Company status', value: 'Active', sourceId: 'ch', folio: 'CH·profile·DM000103', url: chUrl('DM000103') }),
  ev({ id: 'E-042', entityId: 'DM000103', factKey: 'DM000103:incorporated', claim: 'Incorporated', value: '20 Feb 2019', sourceId: 'ch', folio: 'CH·profile·DM000103', url: chUrl('DM000103'), effective: '2019-02-20', recorded: '2019-02-20' }),
  ev({ id: 'E-043', entityId: 'DM000103', factKey: 'DM000103:office', claim: 'Registered office', value: 'Quayside Chambers, 3 Commercial Road, Gloucester GL1 2EB', sourceId: 'ch', folio: 'CH·registered-office·DM000103', url: chUrl('DM000103', '/registered-office-address') }),
  ev({ id: 'E-044', entityId: 'DM000103', factKey: 'DM000103:psc:P-IS', claim: 'Person with significant control (ceased)', value: 'Imelda Sorrensby: ownership of shares, 75% or more', sourceId: 'ch', folio: 'CH·psc·DM000103·1', url: chUrl('DM000103', '/persons-with-significant-control'), effective: '2019-02-20', recorded: '2019-02-20', status: 'historical', excerpt: 'Imelda Sorrensby. Person with significant control from incorporation on 20 February 2019 until 12 July 2021, as stated on the filings.' }),
  ev({ id: 'E-045', entityId: 'DM000103', factKey: 'DM000103:owner', claim: 'Person with significant control', value: 'Quarrow Velloch Holdings Ltd', sourceId: 'ch', folio: 'CH·psc·DM000103·2', url: chUrl('DM000103', '/persons-with-significant-control'), effective: '2021-07-12', recorded: '2021-07-20', excerpt: 'Quarrow Velloch Holdings Ltd. Became a person with significant control on 12 July 2021, as stated on the filing. Notified to Companies House on 20 July 2021. Nature of control: ownership of shares, 75% or more.' }),
  ev({ id: 'E-046', entityId: 'DM000103', factKey: 'DM000103:officer:P-OM', claim: 'Director appointed', value: 'Odile Marchbanks, director', sourceId: 'ch', folio: 'CH·officers·DM000103·2', url: chUrl('DM000103', '/officers'), effective: '2021-07-12', recorded: '2021-07-20' }),
  ev({ id: 'E-047', entityId: 'DM000103', factKey: 'DM000103:officer:P-IS', claim: 'Director (resigned)', value: 'Imelda Sorrensby, director', sourceId: 'ch', folio: 'CH·officers·DM000103·1', url: chUrl('DM000103', '/officers'), effective: '2019-02-20', recorded: '2019-02-20', status: 'historical', excerpt: 'Appointed 20 February 2019. Resigned 12 July 2021.' }),
  ev({ id: 'E-048', entityId: 'DM000103', factKey: 'DM000103:charge1', claim: 'Charge created', value: 'Legal charge over Quayside Chambers in favour of Severn Mutual Bank (fictional)', sourceId: 'ch', folio: 'CH·charges·DM0001030001', url: chUrl('DM000103', '/charges'), effective: '2019-05-14', recorded: '2019-05-21', status: 'historical' }),
  ev({ id: 'E-049', entityId: 'DM000103', factKey: 'DM000103:charge1:repaid', claim: 'Charge satisfied', value: 'Satisfied in full; statement delivered 22 Jan 2025', sourceId: 'ch', folio: 'CH·charges·DM0001030001·MR04', url: chUrl('DM000103', '/charges'), effective: '2025-01-22', recorded: '2025-01-22', excerpt: 'Satisfaction of charge DM0001030001 in full. Statement of satisfaction delivered 22 January 2025.' }),
  ev({ id: 'E-050', entityId: 'DM000103', factKey: 'DM000103:charge1:repaid', claim: 'Loan repayment reported', value: 'Loan repaid in full on 31 Mar 2022', sourceId: 'news', folio: 'SBP·2022-04-04·p11', url: 'https://severnpost.example/2022/04/04/qv-estates-refinance', effective: '2022-03-31', recorded: '2022-04-04', retrieved: '2026-11-14T08:50:00Z', match: 'attribute', excerpt: 'QV Estates said it had repaid its Severn Mutual facility in full on 31 March, ahead of schedule.' }),
  ev({ id: 'E-051', entityId: 'DM000103', factKey: 'DM000103:land', claim: 'Registered proprietor of land', value: 'Title GR-DEMO-4471, Quayside Chambers, Gloucester', sourceId: 'hmlr', folio: 'LAND·GR-DEMO-4471', url: 'https://land.example/title/GR-DEMO-4471', retrieved: '2026-11-01T06:00:00Z', datasetDate: '2026-11-01', match: 'attribute' }),

  // Tarnwick Marine Services Ltd
  ev({ id: 'E-060', entityId: 'DM000104', factKey: 'DM000104:name', claim: 'Registered name', value: 'Tarnwick Marine Services Ltd', sourceId: 'ch', folio: 'CH·profile·DM000104', url: chUrl('DM000104'), retrieved: CH_RETRIEVED_OLDER }),
  ev({ id: 'E-061', entityId: 'DM000104', factKey: 'DM000104:trading', claim: 'Company status', value: 'Dissolved', sourceId: 'ch', folio: 'CH·profile·DM000104', url: chUrl('DM000104'), effective: '2024-02-13', recorded: '2024-02-13', retrieved: CH_RETRIEVED_OLDER }),
  ev({ id: 'E-062', entityId: 'DM000104', factKey: 'DM000104:trading', claim: 'Gazette notice: struck off and dissolved', value: 'Dissolved', sourceId: 'gazette', folio: 'GAZ·notice·D-2024-0213-118', url: 'https://gazette.example/notice/D-2024-0213-118', effective: '2024-02-13', recorded: '2024-02-13', retrieved: '2026-11-14T08:48:00Z', excerpt: 'Notice is hereby given that the following company has been struck off the register and is dissolved: Tarnwick Marine Services Ltd (DM000104).' }),
  ev({ id: 'E-063', entityId: 'DM000104', factKey: 'DM000104:trading', claim: 'Website describes the business as trading', value: 'Trading', sourceId: 'web', folio: 'WEB·tarnwickmarine.example', url: 'https://tarnwickmarine.example/', retrieved: '2026-10-02T11:30:00Z', match: 'attribute', excerpt: 'Tarnwick Marine Services: engine overhauls and hull repairs, open six days a week at the Cattedown yard.' }),
  ev({ id: 'E-064', entityId: 'DM000104', factKey: 'DM000104:incorporated', claim: 'Incorporated', value: '1 Mar 2016', sourceId: 'ch', folio: 'CH·profile·DM000104', url: chUrl('DM000104'), effective: '2016-03-01', recorded: '2016-03-01', retrieved: CH_RETRIEVED_OLDER }),
  ev({ id: 'E-065', entityId: 'DM000104', factKey: 'DM000104:office', claim: 'Registered office', value: 'Dock Road Yard, Cattedown, Plymouth PL4 0RW', sourceId: 'ch', folio: 'CH·registered-office·DM000104', url: chUrl('DM000104', '/registered-office-address'), retrieved: CH_RETRIEVED_OLDER }),
  ev({ id: 'E-066', entityId: 'DM000104', factKey: 'DM000104:officer:P-TQH', claim: 'Director at dissolution', value: 'Teodor Quill-Hartley, director', sourceId: 'ch', folio: 'CH·officers·DM000104·1', url: chUrl('DM000104', '/officers'), effective: '2016-03-01', recorded: '2016-03-01', retrieved: CH_RETRIEVED_OLDER, status: 'historical', excerpt: 'Appointed 1 March 2016. In office when the company was dissolved on 13 February 2024.' }),
  ev({ id: 'E-067', entityId: 'DM000104', factKey: 'DM000104:officer:P-CW', claim: 'Director (resigned)', value: 'Caspar Whitlenge, director', sourceId: 'ch', folio: 'CH·officers·DM000104·2', url: chUrl('DM000104', '/officers'), effective: '2016-03-01', recorded: '2016-03-01', retrieved: CH_RETRIEVED_OLDER, status: 'historical', excerpt: 'Appointed 1 March 2016. Resigned 30 August 2023.' }),
  ev({ id: 'E-068', entityId: 'DM000104', factKey: 'DM000104:psc:P-CW', claim: 'Person with significant control (ceased)', value: 'Caspar Whitlenge: ownership of shares, 75% or more', sourceId: 'ch', folio: 'CH·psc·DM000104·1', url: chUrl('DM000104', '/persons-with-significant-control'), effective: '2016-04-06', recorded: '2016-05-02', retrieved: CH_RETRIEVED_OLDER, status: 'historical' }),
  ev({ id: 'E-069', entityId: 'DM000104', factKey: 'DM000104:psc:P-TQH', claim: 'Person with significant control at dissolution', value: 'Teodor Quill-Hartley: ownership of shares, 75% or more', sourceId: 'ch', folio: 'CH·psc·DM000104·2', url: chUrl('DM000104', '/persons-with-significant-control'), effective: '2023-08-30', recorded: '2023-09-14', retrieved: CH_RETRIEVED_OLDER, status: 'historical' }),
  ev({ id: 'E-070', entityId: 'DM000104', factKey: 'DM000104:first-notice', claim: 'Gazette: first notice of strike-off', value: 'First notice published', sourceId: 'gazette', folio: 'GAZ·notice·F-2023-1121-062', url: 'https://gazette.example/notice/F-2023-1121-062', effective: '2023-11-21', recorded: '2023-11-21', retrieved: '2026-11-14T08:48:00Z', status: 'historical' }),
  ev({ id: 'E-071', entityId: 'DM000104', factKey: 'DM000104:domain', claim: 'Domain registration', value: 'tarnwickmarine.example registered until 1 Mar 2027', sourceId: 'rdap', folio: 'RDAP·tarnwickmarine.example', url: 'https://rdap.example/domain/tarnwickmarine.example', retrieved: '2026-11-14T08:52:00Z', match: 'attribute', excerpt: 'Expiry 2027-03-01. Registrant: redacted for privacy.' }),

  // Hethermoor Trading LLP
  ev({ id: 'E-080', entityId: 'DM000105', factKey: 'DM000105:name', claim: 'Registered name', value: 'Hethermoor Trading LLP', sourceId: 'ch', folio: 'CH·profile·DM000105', url: chUrl('DM000105') }),
  ev({ id: 'E-081', entityId: 'DM000105', factKey: 'DM000105:status', claim: 'Status', value: 'Active', sourceId: 'ch', folio: 'CH·profile·DM000105', url: chUrl('DM000105') }),
  ev({ id: 'E-082', entityId: 'DM000105', factKey: 'DM000105:incorporated', claim: 'Incorporated', value: '10 Jan 2018', sourceId: 'ch', folio: 'CH·profile·DM000105', url: chUrl('DM000105'), effective: '2018-01-10', recorded: '2018-01-10' }),
  ev({ id: 'E-083', entityId: 'DM000105', factKey: 'DM000105:office', claim: 'Registered office', value: 'Wharf House, 14 Narrow Quay, Bristol BS1 4QA', sourceId: 'ch', folio: 'CH·registered-office·DM000105', url: chUrl('DM000105', '/registered-office-address') }),
  ev({ id: 'E-084', entityId: 'DM000105', factKey: 'DM000105:officer:P-TQH', claim: 'Designated member (ceased)', value: 'Teodor Quill-Hartley, designated member', sourceId: 'ch', folio: 'CH·officers·DM000105·1', url: chUrl('DM000105', '/officers'), effective: '2018-01-10', recorded: '2018-01-10', status: 'historical', excerpt: 'Appointed 10 January 2018. Ceased 3 June 2026.' }),
  ev({ id: 'E-085', entityId: 'DM000105', factKey: 'DM000105:officer:P-CW', claim: 'Designated member', value: 'Caspar Whitlenge, designated member', sourceId: 'ch', folio: 'CH·officers·DM000105·2', url: chUrl('DM000105', '/officers'), effective: '2018-01-10', recorded: '2018-01-10' }),
];

// --- Relationships ----------------------------------------------------------

export const relationships: Relationship[] = [
  { id: 'R-01', from: 'P-OM', to: 'DM000101', role: 'director', label: 'Director', start: '2015-03-24', evidenceIds: ['E-008'] },
  { id: 'R-02', from: 'P-OM', to: 'DM000101', role: 'psc', label: 'PSC, 75% or more', start: '2016-04-06', evidenceIds: ['E-007'] },
  { id: 'R-03', from: 'P-IS', to: 'DM000101', role: 'secretary', label: 'Secretary', start: '2019-11-04', evidenceIds: ['E-009'] },
  { id: 'R-10', from: 'DM000105', to: 'DM000102', role: 'parent', label: 'PSC, 75% or more', start: '2018-01-10', end: '2026-06-03', evidenceIds: ['E-025'] },
  { id: 'R-11', from: 'DM000101', to: 'DM000102', role: 'parent', label: 'PSC, 75% or more', start: '2026-06-03', evidenceIds: ['E-026', 'E-028'] },
  { id: 'R-12', from: 'P-OM', to: 'DM000102', role: 'director', label: 'Director', start: '2015-04-01', evidenceIds: ['E-029'] },
  { id: 'R-13', from: 'P-TQH', to: 'DM000102', role: 'director', label: 'Director', start: '2017-09-18', evidenceIds: ['E-030'] },
  { id: 'R-20', from: 'P-IS', to: 'DM000103', role: 'psc', label: 'PSC, 75% or more', start: '2019-02-20', end: '2021-07-12', evidenceIds: ['E-044'] },
  { id: 'R-21', from: 'DM000101', to: 'DM000103', role: 'parent', label: 'PSC, 75% or more', start: '2021-07-12', evidenceIds: ['E-045'] },
  { id: 'R-22', from: 'P-OM', to: 'DM000103', role: 'director', label: 'Director', start: '2021-07-12', evidenceIds: ['E-046'] },
  { id: 'R-23', from: 'P-IS', to: 'DM000103', role: 'director', label: 'Director', start: '2019-02-20', end: '2021-07-12', evidenceIds: ['E-047'] },
  { id: 'R-30', from: 'P-TQH', to: 'DM000104', role: 'director', label: 'Director', start: '2016-03-01', end: '2024-02-13', evidenceIds: ['E-066'] },
  { id: 'R-31', from: 'P-CW', to: 'DM000104', role: 'director', label: 'Director', start: '2016-03-01', end: '2023-08-30', evidenceIds: ['E-067'] },
  { id: 'R-32', from: 'P-CW', to: 'DM000104', role: 'psc', label: 'PSC, 75% or more', start: '2016-04-06', end: '2023-08-30', evidenceIds: ['E-068'] },
  { id: 'R-33', from: 'P-TQH', to: 'DM000104', role: 'psc', label: 'PSC, 75% or more', start: '2023-08-30', end: '2024-02-13', evidenceIds: ['E-069'] },
  { id: 'R-40', from: 'P-TQH', to: 'DM000105', role: 'member', label: 'Designated member', start: '2018-01-10', end: '2026-06-03', evidenceIds: ['E-084'] },
  { id: 'R-41', from: 'P-CW', to: 'DM000105', role: 'member', label: 'Designated member', start: '2018-01-10', evidenceIds: ['E-085'] },
];

// --- Contra entries ---------------------------------------------------------

export const contras: Contra[] = [
  {
    id: 'C-01', entityId: 'DM000102', factKey: 'DM000102:owner',
    title: 'Two sources differ on who has significant control of Velloch Precision Ltd',
    evidenceA: 'E-026', evidenceB: 'E-027',
    difference: 'The register shows Quarrow Velloch Holdings Ltd as the person with significant control from 3 Jun 2026. The company website, captured on 14 Oct 2026, still names Hethermoor Trading LLP as the parent.',
    status: 'open',
  },
  {
    id: 'C-02', entityId: 'DM000103', factKey: 'DM000103:charge1:repaid',
    title: 'Two sources give different dates for the end of the Quayside Chambers charge',
    evidenceA: 'E-049', evidenceB: 'E-050',
    difference: 'The register records a statement of satisfaction delivered on 22 Jan 2025. A news report dated 4 Apr 2022 says the loan was repaid on 31 Mar 2022. The register records when the statement was delivered, not when repayment happened, so both can be accurate.',
    status: 'explained',
  },
  {
    id: 'C-03', entityId: 'DM000104', factKey: 'DM000104:trading',
    title: 'Two sources differ on whether Tarnwick Marine Services Ltd is trading',
    evidenceA: 'E-061', evidenceB: 'E-063',
    difference: 'The register and a Gazette notice show the company dissolved on 13 Feb 2024. The website, captured on 2 Oct 2026, describes the business as open six days a week.',
    status: 'open',
  },
];

// --- Day book ---------------------------------------------------------------

export const dayBook: DayBookEntry[] = [
  { date: '2026-10-14', mark: S, entityId: 'DM000102', folio: 'WEB·velloch-precision.example/about', contraId: 'C-01', text: 'Website snapshot: Velloch Precision Ltd still names Hethermoor Trading LLP as its parent' },
  { date: '2026-10-02', mark: S, entityId: 'DM000104', folio: 'WEB·tarnwickmarine.example', contraId: 'C-03', text: 'Website snapshot: Tarnwick Marine Services Ltd describes itself as open six days a week' },
  { date: '2026-06-24', mark: S, entityId: 'DM000102', folio: 'SBP·2026-06-24·p4', text: 'News: Quarrow Velloch Holdings reported to have taken direct ownership of Velloch Precision' },
  { date: '2026-06-19', mark: S, entityId: 'DM000102', folio: 'CH·psc·DM000102·2', text: 'PSC notified: Quarrow Velloch Holdings Ltd now has significant control of Velloch Precision Ltd (effective 3 Jun 2026)' },
  { date: '2026-06-19', mark: S, entityId: 'DM000102', folio: 'CH·psc·DM000102·1', text: 'PSC ceased: Hethermoor Trading LLP no longer has significant control of Velloch Precision Ltd (effective 3 Jun 2026)' },
  { date: '2026-06-03', mark: S, entityId: 'DM000105', folio: 'CH·officers·DM000105·1', text: 'Member ceased: Teodor Quill-Hartley is no longer a designated member of Hethermoor Trading LLP' },
  { date: '2025-01-22', mark: S, entityId: 'DM000103', folio: 'CH·charges·DM0001030001·MR04', contraId: 'C-02', text: 'Charge satisfied: legal charge over Quayside Chambers recorded as satisfied in full' },
  { date: '2024-02-13', mark: S, entityId: 'DM000104', folio: 'GAZ·notice·D-2024-0213-118', text: 'Dissolved: Tarnwick Marine Services Ltd struck off the register' },
  { date: '2023-11-21', mark: S, entityId: 'DM000104', folio: 'GAZ·notice·F-2023-1121-062', text: 'Gazette: first notice of strike-off for Tarnwick Marine Services Ltd' },
  { date: '2023-08-30', mark: S, entityId: 'DM000104', folio: 'CH·officers·DM000104·2', text: 'Director resigned: Caspar Whitlenge leaves Tarnwick Marine Services Ltd; Teodor Quill-Hartley becomes its PSC' },
  { date: '2023-06-11', mark: S, entityId: 'DM000102', folio: 'ARC·vellochprecision.example·20230611', text: 'Domain change: vellochprecision.example now redirects to velloch-precision.example' },
  { date: '2022-04-04', mark: S, entityId: 'DM000103', folio: 'SBP·2022-04-04·p11', text: 'News: QV Estates reported to have repaid its Severn Mutual facility on 31 Mar 2022' },
  { date: '2021-07-12', mark: S, entityId: 'DM000103', folio: 'CH·psc·DM000103·2', text: 'PSC notified: Quarrow Velloch Holdings Ltd takes significant control of QV Estates (Severn) Ltd' },
  { date: '2019-11-04', mark: S, entityId: 'DM000101', folio: 'CH·officers·DM000101·2', text: 'Secretary appointed: Imelda Sorrensby at Quarrow Velloch Holdings Ltd' },
];
