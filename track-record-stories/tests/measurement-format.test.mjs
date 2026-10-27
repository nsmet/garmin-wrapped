import test from 'node:test';
import assert from 'node:assert/strict';
import {formatNumber,formatDecimal,formatActivityTime} from '../public/measurement-format.mjs';

test('Measurements retain one decimal, including zero, without adding decimals to counts',()=>{
 assert.equal(formatDecimal(21),'21.0');
 assert.equal(formatDecimal(68.26),'68.3');
 assert.equal(formatDecimal(1234.04),'1,234.0');
 assert.equal(formatDecimal(0.1),'0.1');
 assert.equal(formatNumber(52),'52');
});

test('Activity times retain seconds and carry rounded seconds through minute and hour boundaries',()=>{
 for(const [seconds,expected] of [[0,'0m 00s'],[9,'0m 09s'],[59.49,'0m 59s'],[59.5,'1m 00s'],[1801,'30m 01s'],[3599.49,'59m 59s'],[3599.5,'1h 00m 00s'],[3723,'1h 02m 03s'],[90061,'25h 01m 01s']]){
  assert.equal(formatActivityTime(seconds),expected);
 }
});
