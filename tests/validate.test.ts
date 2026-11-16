import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { datesIn, REFUSAL, validate, type DraftSentence } from '../src/lib/assistant/validate';
import { scripted } from '../src/lib/assistant/scripted';
import { entities, evidence } from '../src/data/demo-case';

const names = Object.fromEntries(Object.values(entities).map((e) => [e.id, e.name]));
const check = (s: DraftSentence) => validate([s], evidence, names);
const kept = (s: DraftSentence) => check(s).sentences.length === 1;

describe('scripted demonstrations still behave as designed', () => {
  const run = (id: string) => {
    const q = scripted.find((x) => x.id === id)!;
    return validate(q.draft, evidence, names);
  };
  test('every genuine scripted sentence passes', () => {
    for (const id of ['q-ownership', 'q-disagree', 'q-dissolved', 'q-sanctions']) {
      const r = run(id);
      assert.equal(r.removed.length, 0, `${id}: ${JSON.stringify(r.removed)}`);
    }
  });
  test('the planted sentence is removed and the rest kept', () => {
    const r = run('q-control');
    assert.equal(r.sentences.length, 2);
    assert.equal(r.removed.length, 1);
    assert.match(r.removed[0].reason, /E-099/);
  });
  test('the unsupported question is refused', () => {
    const r = run('q-unsupported');
    assert.equal(r.sentences.length, 0);
    assert.equal(r.refusal, REFUSAL);
  });
});

describe('the contract: citations and quotes', () => {
  test('a sentence with no citation is removed', () =>
    assert.equal(kept({ text: 'Velloch Precision Ltd is active.', citations: [], quotes: ['Active'] }), false));
  test('a sentence with no quotes is removed', () =>
    assert.equal(kept({ text: 'Velloch Precision Ltd is active.', citations: ['E-022'], quotes: [] }), false));
  test('a missing quotes field is treated as no quotes', () =>
    assert.equal(kept({ text: 'Velloch Precision Ltd is active.', citations: ['E-022'] } as unknown as DraftSentence), false));
  test('an empty or trivial quote is removed', () => {
    assert.equal(kept({ text: 'Velloch Precision Ltd is active.', citations: ['E-022'], quotes: [''] }), false);
    assert.equal(kept({ text: 'Velloch Precision Ltd is active.', citations: ['E-022'], quotes: ['A '] }), false);
  });
  test('a quote taken only from the generic claim label does not count', () =>
    assert.equal(kept({ text: 'Velloch Precision Ltd has a company status.', citations: ['E-022'], quotes: ['Company status'] }), false));
  test('a decorative citation that supports no quote is removed', () =>
    assert.equal(kept({ text: 'Velloch Precision Ltd is active.', citations: ['E-022', 'E-031'], quotes: ['Active'] }), false));
  test('a well-formed sentence passes', () =>
    assert.equal(kept({ text: 'Velloch Precision Ltd is active.', citations: ['E-022'], quotes: ['Active'] }), true));
});

describe('genuine citations attached to false conclusions', () => {
  test('wrong date with a real citation is removed', () => {
    const r = check({ text: 'Hethermoor Trading LLP ceased to control Velloch Precision Ltd on 3 Jun 2025.', citations: ['E-025'], quotes: ['Hethermoor Trading LLP'] });
    assert.equal(r.sentences.length, 0);
    assert.match(r.removed[0].reason, /2025-06-03/);
  });
  test('an entity the cited rows do not mention is removed', () => {
    const r = check({ text: 'Tarnwick Marine Services Ltd controls Velloch Precision Ltd.', citations: ['E-026'], quotes: ['Quarrow Velloch Holdings Ltd'] });
    assert.equal(r.sentences.length, 0);
    assert.match(r.removed[0].reason, /Tarnwick/);
  });
  test('a present-tense claim backed only by historical rows is removed', () => {
    const r = check({ text: 'Hethermoor Trading LLP currently controls Velloch Precision Ltd.', citations: ['E-025'], quotes: ['Hethermoor Trading LLP'] });
    assert.equal(r.sentences.length, 0);
    assert.match(r.removed[0].reason, /historical/);
  });
  test('a quoted value that is not in the cited row is removed', () =>
    assert.equal(kept({ text: 'Velloch Precision Ltd is dissolved.', citations: ['E-022'], quotes: ['Dissolved'] }), false));
  test('known limitation: a reversed relationship using genuine names, dates and quotes still passes', () => {
    // The validator checks grounding, not meaning. This sentence is false (the
    // holding company controls Velloch Precision, not the other way round) but every
    // name, date and quote appears in E-026. This test documents the gap; the UI tells
    // the reader the check does not judge meaning.
    const r = check({ text: 'Velloch Precision Ltd has controlled Quarrow Velloch Holdings Ltd since 3 Jun 2026.', citations: ['E-026'], quotes: ['Quarrow Velloch Holdings Ltd'] });
    assert.equal(r.sentences.length, 1);
  });
});

describe('date extraction', () => {
  test('reads short, long and ISO dates', () => {
    assert.deepEqual(datesIn('on 3 Jun 2026, 10 January 2018 and 2025-01-22'), ['2026-06-03', '2018-01-10', '2025-01-22']);
  });
});
