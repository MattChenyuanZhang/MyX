import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code = fs.readFileSync(new URL('../extension/boot.js', import.meta.url), 'utf8');
function boot(hash, open, storageThrows = false) {
  const mounts=[];
  vm.runInNewContext(code, {
    location:{hash},
    sessionStorage:{getItem(){if(storageThrows)throw Error('unavailable');return open;}},
    MyXShell:{mount(options){mounts.push(options);}},
  });
  return mounts;
}
test('first MyX visit mounts the reader shell before account or DOM readiness',()=>{
  assert.equal(boot('#myx',null).length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(boot('#myx',null)[0])),{open:true,loading:true});
});
test('refresh and native route navigation reuse the loading shell only when MyX was open',()=>{
  assert.equal(boot('', '1').length,1);
  assert.equal(boot('',null).length,0);
  assert.equal(boot('',null,true).length,0);
  assert.equal(boot('#myx',null,true).length,1);
});
