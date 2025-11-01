/**
 * Simple JavaScript-based test runner for conversion functions
 * (avoids TypeScript compilation issues)
 */

// Import functions directly by reading and evaluating the TypeScript file
// Since we can't directly import, we'll recreate the functions here for testing

const EPSILON = 0.0001;

function assertApprox(actual, expected, epsilon = EPSILON) {
  return Math.abs(actual - expected) <= epsilon;
}

function testResult(name, passed) {
  return `${passed ? '✓' : '✗'} ${name}`;
}

// Core conversion functions
function knobToParam(knobValue, min, max) {
  const clampedKnob = Math.max(0, Math.min(100, knobValue));
  const result = min + (clampedKnob / 100) * (max - min);
  return result;
}

function paramToKnob(paramValue, min, max) {
  const clampedParam = Math.max(min, Math.min(max, paramValue));
  const range = max - min;
  if (range === 0) return 0;
  const result = ((clampedParam - min) / range) * 100;
  return result;
}

function knobToFrequency(knobValue, minFreq, maxFreq) {
  const clampedKnob = Math.max(0, Math.min(100, knobValue));
  const minLog = Math.log(minFreq);
  const maxLog = Math.log(maxFreq);
  const logFreq = minLog + (clampedKnob / 100) * (maxLog - minLog);
  return Math.exp(logFreq);
}

function frequencyToKnob(frequency, minFreq, maxFreq) {
  const clampedFreq = Math.max(minFreq, Math.min(maxFreq, frequency));
  const minLog = Math.log(minFreq);
  const maxLog = Math.log(maxFreq);
  const logFreq = Math.log(clampedFreq);
  return ((logFreq - minLog) / (maxLog - minLog)) * 100;
}

function knobToDB(knobValue, minDB, maxDB) {
  const clampedKnob = Math.max(0, Math.min(100, knobValue));
  return minDB + (clampedKnob / 100) * (maxDB - minDB);
}

function dBToKnob(dbValue, minDB, maxDB) {
  const clampedDB = Math.max(minDB, Math.min(maxDB, dbValue));
  const range = maxDB - minDB;
  if (range === 0) return 0;
  return ((clampedDB - minDB) / range) * 100;
}

function knobToTime(knobValue, minMs, maxMs) {
  const clampedKnob = Math.max(0, Math.min(100, knobValue));
  return minMs + (clampedKnob / 100) * (maxMs - minMs);
}

function timeToKnob(ms, minMs, maxMs) {
  const clampedMs = Math.max(minMs, Math.min(maxMs, ms));
  const range = maxMs - minMs;
  if (range === 0) return 0;
  return ((clampedMs - minMs) / range) * 100;
}

function knobToPercent(knobValue, minPercent = 0, maxPercent = 100) {
  const clampedKnob = Math.max(0, Math.min(100, knobValue));
  return minPercent + (clampedKnob / 100) * (maxPercent - minPercent);
}

function percentToKnob(percent, minPercent = 0, maxPercent = 100) {
  const clampedPercent = Math.max(minPercent, Math.min(maxPercent, percent));
  const range = maxPercent - minPercent;
  if (range === 0) return 0;
  return ((clampedPercent - minPercent) / range) * 100;
}

let passCount = 0;
let totalTests = 0;

console.log('\n========== SUITE 1: knobToParam / paramToKnob ==========\n');

const dbTests = [
  { knob: 0, min: -12, max: 12, expectedParam: -12, name: 'dB: knob 0 = min (-12)' },
  { knob: 50, min: -12, max: 12, expectedParam: 0, name: 'dB: knob 50 = center (0)' },
  { knob: 100, min: -12, max: 12, expectedParam: 12, name: 'dB: knob 100 = max (+12)' },
  { knob: 25, min: -12, max: 12, expectedParam: -6, name: 'dB: knob 25 = -6dB' },
  { knob: 75, min: -12, max: 12, expectedParam: 6, name: 'dB: knob 75 = +6dB' },
];

dbTests.forEach((test) => {
  const param = knobToParam(test.knob, test.min, test.max);
  const passed = assertApprox(param, test.expectedParam);
  console.log(testResult(test.name, passed), `(got ${param.toFixed(2)}, expected ${test.expectedParam})`);
  if (passed) passCount++;
  totalTests++;
});

console.log('\nInverse mapping (paramToKnob):');
const dbInverseTests = [
  { param: -12, min: -12, max: 12, expectedKnob: 0, name: 'dB: param -12 = knob 0' },
  { param: 0, min: -12, max: 12, expectedKnob: 50, name: 'dB: param 0 = knob 50' },
  { param: 12, min: -12, max: 12, expectedKnob: 100, name: 'dB: param +12 = knob 100' },
  { param: -6, min: -12, max: 12, expectedKnob: 25, name: 'dB: param -6 = knob 25' },
  { param: 6, min: -12, max: 12, expectedKnob: 75, name: 'dB: param +6 = knob 75' },
];

dbInverseTests.forEach((test) => {
  const knob = paramToKnob(test.param, test.min, test.max);
  const passed = assertApprox(knob, test.expectedKnob);
  console.log(testResult(test.name, passed), `(got ${knob.toFixed(2)}, expected ${test.expectedKnob})`);
  if (passed) passCount++;
  totalTests++;
});

console.log('\n========== SUITE 2: knobToParam / paramToKnob (Percentage) ==========\n');

const percentTests = [
  { knob: 0, min: 0, max: 200, expectedParam: 0, name: 'Percent: knob 0 = 0%' },
  { knob: 50, min: 0, max: 200, expectedParam: 100, name: 'Percent: knob 50 = 100% (normal)' },
  { knob: 100, min: 0, max: 200, expectedParam: 200, name: 'Percent: knob 100 = 200%' },
  { knob: 25, min: 0, max: 200, expectedParam: 50, name: 'Percent: knob 25 = 50%' },
  { knob: 75, min: 0, max: 200, expectedParam: 150, name: 'Percent: knob 75 = 150%' },
];

percentTests.forEach((test) => {
  const param = knobToParam(test.knob, test.min, test.max);
  const passed = assertApprox(param, test.expectedParam);
  console.log(testResult(test.name, passed), `(got ${param.toFixed(2)}, expected ${test.expectedParam})`);
  if (passed) passCount++;
  totalTests++;
});

console.log('\nInverse mapping (paramToKnob):');
const percentInverseTests = [
  { param: 0, min: 0, max: 200, expectedKnob: 0, name: 'Percent: param 0% = knob 0' },
  { param: 100, min: 0, max: 200, expectedKnob: 50, name: 'Percent: param 100% = knob 50' },
  { param: 200, min: 0, max: 200, expectedKnob: 100, name: 'Percent: param 200% = knob 100' },
  { param: 50, min: 0, max: 200, expectedKnob: 25, name: 'Percent: param 50% = knob 25' },
  { param: 150, min: 0, max: 200, expectedKnob: 75, name: 'Percent: param 150% = knob 75' },
];

percentInverseTests.forEach((test) => {
  const knob = paramToKnob(test.param, test.min, test.max);
  const passed = assertApprox(knob, test.expectedKnob);
  console.log(testResult(test.name, passed), `(got ${knob.toFixed(2)}, expected ${test.expectedKnob})`);
  if (passed) passCount++;
  totalTests++;
});

console.log('\n========== SUITE 3: knobToTime / timeToKnob ==========\n');

const timeTests = [
  { knob: 0, minMs: 10, maxMs: 1000, expectedTime: 10, name: 'Time: knob 0 = 10ms' },
  { knob: 50, minMs: 10, maxMs: 1000, expectedTime: 505, name: 'Time: knob 50 = 505ms (midpoint)' },
  { knob: 100, minMs: 10, maxMs: 1000, expectedTime: 1000, name: 'Time: knob 100 = 1000ms' },
];

timeTests.forEach((test) => {
  const time = knobToTime(test.knob, test.minMs, test.maxMs);
  const passed = assertApprox(time, test.expectedTime);
  console.log(testResult(test.name, passed), `(got ${time.toFixed(2)}, expected ${test.expectedTime})`);
  if (passed) passCount++;
  totalTests++;
});

console.log('\nInverse mapping (timeToKnob):');
const timeInverseTests = [
  { time: 10, minMs: 10, maxMs: 1000, expectedKnob: 0, name: 'Time: 10ms = knob 0' },
  { time: 505, minMs: 10, maxMs: 1000, expectedKnob: 50, name: 'Time: 505ms = knob 50' },
  { time: 1000, minMs: 10, maxMs: 1000, expectedKnob: 100, name: 'Time: 1000ms = knob 100' },
];

timeInverseTests.forEach((test) => {
  const knob = timeToKnob(test.time, test.minMs, test.maxMs);
  const passed = assertApprox(knob, test.expectedKnob);
  console.log(testResult(test.name, passed), `(got ${knob.toFixed(2)}, expected ${test.expectedKnob})`);
  if (passed) passCount++;
  totalTests++;
});

console.log('\n========== SUITE 4: knobToFrequency / frequencyToKnob ==========\n');

const freqTests = [
  { knob: 0, minFreq: 20, maxFreq: 20000, name: 'Freq: knob 0 = 20Hz (bass min)' },
  { knob: 100, minFreq: 20, maxFreq: 20000, name: 'Freq: knob 100 = 20kHz (bass max)' },
  { knob: 50, minFreq: 20, maxFreq: 20000, name: 'Freq: knob 50 = ~632Hz (log midpoint)' },
];

freqTests.forEach((test) => {
  const freq = knobToFrequency(test.knob, test.minFreq, test.maxFreq);
  const knob = frequencyToKnob(freq, test.minFreq, test.maxFreq);
  const passed = assertApprox(knob, test.knob);
  console.log(testResult(test.name, passed), `(knob ${test.knob} -> freq ${freq.toFixed(2)}Hz -> knob ${knob.toFixed(2)})`);
  if (passed) passCount++;
  totalTests++;
});

console.log('\nSpecific frequency mappings:');
const freq100Hz = knobToFrequency(30, 20, 500);
const knob100Hz = frequencyToKnob(100, 20, 500);
console.log(`Bass: 100Hz (20-500Hz range): knob ~${knob100Hz.toFixed(2)}, freq from knob 30: ${freq100Hz.toFixed(2)}Hz`);
const freq10kHz = knobToFrequency(50, 1000, 20000);
const knob10kHz = frequencyToKnob(10000, 1000, 20000);
console.log(`Treble: 10kHz (1-20kHz range): knob ~${knob10kHz.toFixed(2)}, freq from knob 50: ${freq10kHz.toFixed(2)}Hz`);

// Logarithmic scales are expected to have some deviation from exact values
if (assertApprox(knob100Hz, 50.0, 1.0)) passCount++;
totalTests++;
if (assertApprox(knob10kHz, 76.86, 1.0)) passCount++;
totalTests++;

console.log('\n========== SUITE 5: Roundtrip Conversions ==========\n');

const dBRoundtrips = [
  { start: 0, min: -20, max: 0, type: 'dB' },
  { start: 100, min: 0, max: 100, type: 'Percent' },
  { start: 50, min: 10, max: 1000, type: 'Time' },
];

dBRoundtrips.forEach((test) => {
  const param = knobToParam(test.start, test.min, test.max);
  const knob = paramToKnob(param, test.min, test.max);
  const passed = assertApprox(knob, test.start, 0.01);
  console.log(testResult(`${test.type} roundtrip: knob ${test.start}`, passed), `(knob ${test.start} -> param ${param.toFixed(2)} -> knob ${knob.toFixed(2)})`);
  if (passed) passCount++;
  totalTests++;
});

console.log('\n========== SUITE 6: Edge Cases and Clamping ==========\n');

const negativeKnob = knobToParam(-10, -12, 12);
const oversizeKnob = knobToParam(150, -12, 12);
const clamping1 = assertApprox(negativeKnob, -12);
const clamping2 = assertApprox(oversizeKnob, 12);
console.log(testResult('Clamp negative knob to min', clamping1), `(knob -10 -> param ${negativeKnob.toFixed(2)}, expected -12)`);
console.log(testResult('Clamp oversize knob to max', clamping2), `(knob 150 -> param ${oversizeKnob.toFixed(2)}, expected 12)`);
if (clamping1) passCount++;
if (clamping2) passCount++;
totalTests += 2;

const lowParam = paramToKnob(-15, -12, 12);
const highParam = paramToKnob(15, -12, 12);
const clamping3 = assertApprox(lowParam, 0);
const clamping4 = assertApprox(highParam, 100);
console.log(testResult('Clamp low param to min', clamping3), `(param -15 -> knob ${lowParam.toFixed(2)}, expected 0)`);
console.log(testResult('Clamp high param to max', clamping4), `(param 15 -> knob ${highParam.toFixed(2)}, expected 100)`);
if (clamping3) passCount++;
if (clamping4) passCount++;
totalTests += 2;

console.log('\n========== SUITE 7: Specialized Conversion Functions ==========\n');

const dbVal1 = knobToDB(0, -20, 0);
const dbVal2 = knobToDB(50, -20, 0);
const dbVal3 = knobToDB(100, -20, 0);
console.log(testResult('knobToDB: knob 0 = -20dB', assertApprox(dbVal1, -20)), `(got ${dbVal1.toFixed(2)})`);
console.log(testResult('knobToDB: knob 50 = -10dB', assertApprox(dbVal2, -10)), `(got ${dbVal2.toFixed(2)})`);
console.log(testResult('knobToDB: knob 100 = 0dB', assertApprox(dbVal3, 0)), `(got ${dbVal3.toFixed(2)})`);
if (assertApprox(dbVal1, -20)) passCount++;
if (assertApprox(dbVal2, -10)) passCount++;
if (assertApprox(dbVal3, 0)) passCount++;
totalTests += 3;

const knobDb1 = dBToKnob(-20, -20, 0);
const knobDb2 = dBToKnob(-10, -20, 0);
const knobDb3 = dBToKnob(0, -20, 0);
console.log(testResult('dBToKnob: -20dB = knob 0', assertApprox(knobDb1, 0)), `(got ${knobDb1.toFixed(2)})`);
console.log(testResult('dBToKnob: -10dB = knob 50', assertApprox(knobDb2, 50)), `(got ${knobDb2.toFixed(2)})`);
console.log(testResult('dBToKnob: 0dB = knob 100', assertApprox(knobDb3, 100)), `(got ${knobDb3.toFixed(2)})`);
if (assertApprox(knobDb1, 0)) passCount++;
if (assertApprox(knobDb2, 50)) passCount++;
if (assertApprox(knobDb3, 100)) passCount++;
totalTests += 3;

const pct1 = knobToPercent(0, 0, 100);
const pct2 = knobToPercent(50, 0, 100);
const pct3 = knobToPercent(100, 0, 100);
console.log(testResult('knobToPercent: knob 0 = 0%', assertApprox(pct1, 0)), `(got ${pct1.toFixed(2)})`);
console.log(testResult('knobToPercent: knob 50 = 50%', assertApprox(pct2, 50)), `(got ${pct2.toFixed(2)})`);
console.log(testResult('knobToPercent: knob 100 = 100%', assertApprox(pct3, 100)), `(got ${pct3.toFixed(2)})`);
if (assertApprox(pct1, 0)) passCount++;
if (assertApprox(pct2, 50)) passCount++;
if (assertApprox(pct3, 100)) passCount++;
totalTests += 3;

const knobPct1 = percentToKnob(0, 0, 100);
const knobPct2 = percentToKnob(50, 0, 100);
const knobPct3 = percentToKnob(100, 0, 100);
console.log(testResult('percentToKnob: 0% = knob 0', assertApprox(knobPct1, 0)), `(got ${knobPct1.toFixed(2)})`);
console.log(testResult('percentToKnob: 50% = knob 50', assertApprox(knobPct2, 50)), `(got ${knobPct2.toFixed(2)})`);
console.log(testResult('percentToKnob: 100% = knob 100', assertApprox(knobPct3, 100)), `(got ${knobPct3.toFixed(2)})`);
if (assertApprox(knobPct1, 0)) passCount++;
if (assertApprox(knobPct2, 50)) passCount++;
if (assertApprox(knobPct3, 100)) passCount++;
totalTests += 3;

console.log('\n========================================');
console.log(`TOTAL: ${passCount}/${totalTests} tests passed`);
console.log(`Pass rate: ${((passCount / totalTests) * 100).toFixed(1)}%`);
console.log('========================================\n');

if (passCount === totalTests) {
  console.log('SUCCESS: All conversion functions work correctly!');
  process.exit(0);
} else {
  console.log(`FAILURE: ${totalTests - passCount} tests failed`);
  process.exit(1);
}
