/* Range-header parser tests — the rules that make the self-hosted APK download
 * resume correctly in a real download manager.  Run: node test/range-test.js
 *
 * Pure logic, so this needs no server: it requires server.js (which no longer
 * binds a port on require) and drives parseByteRange directly. */
'use strict';

const { parseByteRange } = require('../server.js');

let failures = 0;
let checks = 0;
function eq(actual, expected, label) {
  checks++;
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  const pass = a === e;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label} — ${a}`);
  if (!pass) { console.log('       expected: ' + e); failures++; }
}

const SIZE = 1000;
const ignore = { kind: 'ignore' };
const unsat = { kind: 'unsatisfiable' };

/* ---- ordinary ranges ---- */
eq(parseByteRange('bytes=0-99', SIZE), { kind: 'range', start: 0, end: 99 }, 'first 100 bytes');
eq(parseByteRange('bytes=100-199', SIZE), { kind: 'range', start: 100, end: 199 }, 'a middle window');
eq(parseByteRange('bytes=999-999', SIZE), { kind: 'range', start: 999, end: 999 }, 'the final byte');
eq(parseByteRange('bytes=500-', SIZE), { kind: 'range', start: 500, end: 999 }, 'open-ended range runs to the end');
eq(parseByteRange('bytes=0-0', SIZE), { kind: 'range', start: 0, end: 0 }, 'a single leading byte');

/* ---- the two that used to break resumable downloads ---- */
eq(parseByteRange('bytes=-200', SIZE), { kind: 'range', start: 800, end: 999 }, 'suffix range = the LAST 200 bytes');
eq(parseByteRange('bytes=-100000', SIZE), { kind: 'range', start: 0, end: 999 }, 'suffix longer than the file = the whole file');
eq(parseByteRange('bytes=0-99999999', SIZE), { kind: 'range', start: 0, end: 999 }, 'end past the end is clipped, not 416');
eq(parseByteRange('bytes=999-99999999', SIZE), { kind: 'range', start: 999, end: 999 }, 'clipped end keeps the real start');

/* ---- unsatisfiable: 416, with Content-Range: bytes *\/size ---- */
eq(parseByteRange('bytes=1000-', SIZE), unsat, 'start at EOF is unsatisfiable');
eq(parseByteRange('bytes=99999999-', SIZE), unsat, 'start beyond EOF is unsatisfiable');
eq(parseByteRange('bytes=-0', SIZE), unsat, 'a zero-length suffix is unsatisfiable');
eq(parseByteRange('bytes=0-0', 0), unsat, 'an empty file can never satisfy a range');

/* ---- invalid or unknown: the spec says ignore and send the whole body ---- */
eq(parseByteRange(undefined, SIZE), ignore, 'no header');
eq(parseByteRange('', SIZE), ignore, 'empty header');
eq(parseByteRange('items=0-99', SIZE), ignore, 'unknown range unit');
eq(parseByteRange('bytes=abc', SIZE), ignore, 'garbage spec');
eq(parseByteRange('bytes=-', SIZE), ignore, 'empty spec');
eq(parseByteRange('bytes=1-2-3', SIZE), ignore, 'malformed spec');
eq(parseByteRange('bytes=5-2', SIZE), ignore, 'last before first is invalid, not unsatisfiable');
eq(parseByteRange('bytes=0-99, 200-299', SIZE), ignore, 'multi-range is served whole');

/* ---- whitespace + case, as a client might send it ---- */
eq(parseByteRange('  Bytes=0-49  ', SIZE), { kind: 'range', start: 0, end: 49 }, 'unit and padding are case/space tolerant');
eq(parseByteRange('BYTES=-10', SIZE), { kind: 'range', start: 990, end: 999 }, 'uppercase unit with a suffix');

/* ---- numbers stay exact at the float64 integer limit ---- */
eq(parseByteRange('bytes=9007199254740990-', 9007199254740992),
  { kind: 'range', start: 9007199254740990, end: 9007199254740991 },
  'offsets at the 2^53 boundary stay exact (BigInt maths)');

console.log(failures === 0
  ? `\n✅ all ${checks} range rules passed`
  : `\n❌ ${failures} of ${checks} range rule(s) failed`);
process.exit(failures === 0 ? 0 : 1);
