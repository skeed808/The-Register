// Scripted questions for the demonstration case. They answer without any model call,
// so the demo works when AI services are down or the budget is spent. Every answer
// still passes through validate(), exactly like a model answer.
import type { DraftSentence } from './validate';

export interface ScriptedQuestion {
  id: string;
  question: string;
  draft: DraftSentence[];
  note?: string;
}

export const scripted: ScriptedQuestion[] = [
  {
    id: 'q-ownership',
    question: 'What changed in the ownership of Velloch Precision?',
    draft: [
      { text: 'Hethermoor Trading LLP had significant control of Velloch Precision Ltd from 10 Jan 2018 until 3 Jun 2026.', citations: ['E-025'], quotes: ['Hethermoor Trading LLP', 'Ceased on 3 June 2026'] },
      { text: 'Quarrow Velloch Holdings Ltd was notified as its person with significant control from 3 Jun 2026; the change reached the register on 19 Jun 2026.', citations: ['E-026'], quotes: ['Quarrow Velloch Holdings Ltd'] },
      { text: 'A news report dated 24 Jun 2026 describes the same change as an internal reorganisation.', citations: ['E-028'], quotes: ['internal reorganisation'] },
      { text: 'The company website, captured on 14 Oct 2026, still names Hethermoor Trading LLP as the parent, so the sources differ.', citations: ['E-027'], quotes: ['Hethermoor Trading'] },
    ],
  },
  {
    id: 'q-disagree',
    question: 'Where do the sources disagree?',
    draft: [
      { text: 'On Velloch Precision Ltd, the register shows Quarrow Velloch Holdings Ltd in control from 3 Jun 2026, while the website still names Hethermoor Trading LLP.', citations: ['E-026', 'E-027'], quotes: ['Quarrow Velloch Holdings Ltd', 'Hethermoor Trading'] },
      { text: 'On Tarnwick Marine Services Ltd, the register and a Gazette notice show it dissolved on 13 Feb 2024, while its website describes the business as open six days a week.', citations: ['E-061', 'E-062', 'E-063'], quotes: ['Dissolved', 'open six days a week'] },
      { text: 'On QV Estates (Severn) Ltd, a news report dates the loan repayment to 31 Mar 2022 and the register records the charge satisfied on 22 Jan 2025; the researcher has marked this one explained.', citations: ['E-049', 'E-050'], quotes: ['22 Jan 2025', '31 Mar 2022'] },
    ],
  },
  {
    id: 'q-control',
    question: 'Which companies does Quarrow Velloch Holdings control?',
    note: 'This answer includes one planted sentence with a citation that is not in the case, to show the check removing it.',
    draft: [
      { text: 'Quarrow Velloch Holdings Ltd has had significant control of QV Estates (Severn) Ltd since 12 Jul 2021.', citations: ['E-045'], quotes: ['Quarrow Velloch Holdings Ltd'] },
      { text: 'It has had significant control of Velloch Precision Ltd since 3 Jun 2026.', citations: ['E-026'], quotes: ['Quarrow Velloch Holdings Ltd'] },
      { text: 'It also controls a marine engineering business in Cornwall.', citations: ['E-099'] },
    ],
  },
  {
    id: 'q-dissolved',
    question: 'Has any officer served at a dissolved company?',
    draft: [
      { text: 'Teodor Quill-Hartley was a director of Tarnwick Marine Services Ltd from 1 Mar 2016 and was in office when it was dissolved on 13 Feb 2024.', citations: ['E-066', 'E-061'], quotes: ['Teodor Quill-Hartley', 'Dissolved'] },
      { text: 'He has been a director of Velloch Precision Ltd since 18 Sep 2017.', citations: ['E-030'], quotes: ['Teodor Quill-Hartley'] },
      { text: 'The evidence records these appointments only; it says nothing about why the company was dissolved.', citations: ['E-062'] },
    ],
  },
  {
    id: 'q-sanctions',
    question: 'Was anyone screened against the sanctions list?',
    draft: [
      { text: 'Teodor Quill-Hartley was screened against a fictional extract of the UK Sanctions List dated 11 Nov 2026, with no match.', citations: ['E-033'], quotes: ['No match'] },
      { text: 'The closest candidate was rejected because the year of birth and nationality differ.', citations: ['E-033'], quotes: ['different year of birth'] },
    ],
  },
  {
    id: 'q-unsupported',
    question: 'Where does Teodor Quill-Hartley live?',
    note: 'The case holds no home addresses, and the assistant is not allowed to look further.',
    draft: [],
  },
];
