import { LAST_APP_COOKIE_NAME } from '@/lib/auth-session';

/**
 * Blocking script on `/`: jump to last app before React hydrates.
 * Same speed as a server redirect, but safe for offline PWA (start_url `/`).
 */
export function getLastAppResumeInlineScript(): string {
  const prefix = JSON.stringify(`${LAST_APP_COOKIE_NAME}=`);
  return `(function(){try{
if(location.pathname!=='/')return;
var map={cell:'/cell',ndcpc:'/ndcpc',users:'/users',accounts:'/accounts',updates:'/feedback'};
var app=null;
try{app=localStorage.getItem('ndcCommunityLastApp');}catch(e){}
if(!app){
var prefix=${prefix};
var parts=document.cookie.split(';');
for(var i=0;i<parts.length;i++){
var p=parts[i].trim();
if(p.indexOf(prefix)===0){app=decodeURIComponent(p.slice(prefix.length));break;}
}
}
var href=app&&map[app];
if(href)location.replace(href);
}catch(e){}})();`.replace(/\s+/g, ' ');
}
