// The assistant's model step, run against a mock model. No network, no key, no cost.
// These prove the pipeline's handling of model output; they say nothing about how a
// real model answers. Live-model behaviour is checked by scripts/validate-live.mjs.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MockLanguageModelV3 } from 'ai/test';
import { answerQuestion } from '../src/lib/assistant/answer';
import { REFUSAL } from '../src/lib/assistant/validate';
import { entities, evidence } from '../src/data/demo-case';

const names = Object.fromEntries(Object.values(entities).map((e) => [e.id, e.name]));

function model(text: string, calls: unknown[] = []) {
  return new MockLanguageModelV3({
    doGenerate: async (opts: unknown) => {
      calls.push(opts);
      return {
        content: [{ type: 'text', text }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } },
        warnings: [],
      } as never;
    },
  });
}
const json = (sentences: unknown[]) => JSON.stringify({ sentences });

describe('assistant model step (mock model)', () => {
  test('a grounded answer passes validation', async () => {
    const r = await answerQuestion(model(json([
      { text: 'Quarrow Velloch Holdings Ltd has had significant control of Velloch Precision Ltd since 3 Jun 2026.', citations: ['E-026'], quotes: ['Quarrow Velloch Holdings Ltd'] },
    ])), 'Who controls Velloch Precision?', evidence, names);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.answer.sentences.length, 1);
  });

  test('output that is not JSON is reported as malformed, never shown', async () => {
    const r = await answerQuestion(model('Sure! Velloch is owned by Hethermoor.'), 'q', evidence, names);
    assert.deepEqual(r, { ok: false, reason: 'malformed' });
  });

  test('JSON that breaks the schema (no quotes) is reported as malformed', async () => {
    const r = await answerQuestion(model(json([{ text: 'Velloch Precision Ltd is active.', citations: ['E-022'] }])), 'q', evidence, names);
    assert.deepEqual(r, { ok: false, reason: 'malformed' });
  });

  test('JSON with an empty quote is reported as malformed', async () => {
    const r = await answerQuestion(model(json([{ text: 'Velloch Precision Ltd is active.', citations: ['E-022'], quotes: [''] }])), 'q', evidence, names);
    assert.deepEqual(r, { ok: false, reason: 'malformed' });
  });

  test('an empty answer becomes the refusal', async () => {
    const r = await answerQuestion(model(json([])), 'Where does Teodor Quill-Hartley live?', evidence, names);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.answer.refusal, REFUSAL);
  });

  test('genuine evidence with misleading conclusions: the misleading sentences are removed, the grounded one kept', async () => {
    const r = await answerQuestion(model(json([
      { text: 'Hethermoor Trading LLP currently controls Velloch Precision Ltd.', citations: ['E-025'], quotes: ['Hethermoor Trading LLP'] },
      { text: 'Tarnwick Marine Services Ltd took control of Velloch Precision Ltd.', citations: ['E-026'], quotes: ['Quarrow Velloch Holdings Ltd'] },
      { text: 'Velloch Precision Ltd changed owner on 1 Jan 2026.', citations: ['E-026'], quotes: ['Quarrow Velloch Holdings Ltd'] },
      { text: 'The register shows Quarrow Velloch Holdings Ltd in control from 3 Jun 2026.', citations: ['E-026'], quotes: ['Quarrow Velloch Holdings Ltd'] },
    ])), 'q', evidence, names);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.answer.sentences.length, 1);
    assert.equal(r.answer.removed.length, 3);
  });

  test('a model or network error is reported as failed', async () => {
    const broken = new MockLanguageModelV3({ doGenerate: async () => { throw new Error('connection reset'); } });
    const r = await answerQuestion(broken, 'q', evidence, names);
    assert.deepEqual(r, { ok: false, reason: 'failed' });
  });

  test('the model receives the case evidence and the no-conduct rule, and nothing else to search', async () => {
    const calls: any[] = [];
    await answerQuestion(model(json([]), calls), 'q', evidence, names);
    const sent = JSON.stringify(calls[0]);
    assert.match(sent, /E-026/);
    assert.match(sent, /Never characterise a person's conduct/);
    assert.equal(calls[0].tools, undefined);
  });
});
