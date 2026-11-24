// Per-tab session storage. No post data goes to a server or sync storage.
const key=id=>'myx:'+id;
chrome.runtime.onMessage.addListener((m,sender,reply)=>{
  if(!sender.tab||!/^https:\/\/x\.com\//.test(sender.url||''))return;
  const k=key(sender.tab.id);
  (async()=>{
    if(m.type==='GET')return (await chrome.storage.session.get(k))[k]||null;
    if(m.type==='SET'&&m.data&&JSON.stringify(m.data).length<2000000){await chrome.storage.session.set({[k]:m.data});return {ok:true};}
    if(m.type==='CLEAR'){await chrome.storage.session.remove(k);return {ok:true};}
    return null;
  })().then(reply,()=>reply({error:'Session storage unavailable. Reload MyX.'}));
  return true;
});
chrome.tabs.onRemoved.addListener(id=>chrome.storage.session.remove(key(id)));
