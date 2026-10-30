// The opening film. A two-second film of the Reputra tap card (authored in film/ with Remotion,
// rendered to public/film/): it turns in the light, taps, and the camera dives into its amber
// dot. The film ends on flat amber; on that same amber the page sets a title card (the thanks,
// in the customer's language, and the business name rising on masked lines), then the amber
// lifts away and the page's own entrance plays beneath it. ~2.8s; a tap or a key skips it.
//
// Built for slow phone internet, which is the normal case. Two halves:
//
// <FilmStage> is in the page's static shell, the first bytes a customer receives, so the browser
// starts downloading the film at once (~0.3s on 3G). Anything inside the streamed part only
// starts after its stylesheet and React's swap script, which on 3G was 1.4s. The browser takes
// the first source it can play: AV1 (57 KB phone / 69 KB wide), else VP9 (67 / 147 KB), else
// H.264 for iPhones (92 / 200 KB), cached for a year. Every source requires
// prefers-reduced-motion: no-preference, so those phones download nothing.
//
// <FilmStage> also carries a tiny script that runs as the shell is parsed, before the download
// begins: it drops the sources when this visit will never show the film (reduced motion, Data Saver,
// a 2G connection, already played in this tab, or not a review page), so those phones download nothing.
// Otherwise it starts the film unseen and pauses it on its first frame: that makes iPhones (which
// ignore preload) fetch it now, and wakes the decoder, so the film can appear the moment it's asked.
//
// <Intro> streams in with the business and takes control with an inline script (before React,
// which never touches either half while hydrating). The rule is that the customer never looks at
// a black or frozen screen:
//   wait  the film is asked to play, but the stage stays invisible and the page holds still,
//         until the video is really playing (moving, with frames to spare); then the film fades in
//         on its first frame (on).
//   card  if the film isn't playing within half a second (slow line, iPhone in Low Power Mode,
//         a decoder that refuses), or stalls midway, or the shell dropped it, the page skips
//         straight to the title card. It is CSS on flat amber, so it needs nothing from the network.
// No intro at all when the owner turned it off, for reduced motion, or once it has played in this
// tab (coming back from Google doesn't replay it). The owner's preview link ignores that last rule
// and waits up to 6s for the film. <html data-rv-intro> holds the phase: wait → on → title → lift →
// done, or off; data-rv-intro-film="no" marks the title card without the film, and
// data-rv-intro-why says why something was skipped.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const MOTION = "(prefers-reduced-motion: no-preference)";
const PHONE = `${MOTION} and (max-aspect-ratio: 1/1)`;
const SOURCES = [
  ["/film/intro-portrait.v1.av1.webm", 'video/webm; codecs="av01.0.05M.08"', PHONE],
  ["/film/intro-portrait-lite.v1.vp9.webm", 'video/webm; codecs="vp9"', PHONE],
  ["/film/intro-portrait-lite.v1.mp4", "video/mp4", PHONE],
  ["/film/intro-wide.v1.av1.webm", 'video/webm; codecs="av01.0.05M.08"', MOTION],
  ["/film/intro-wide.v1.vp9.webm", 'video/webm; codecs="vp9"', MOTION],
  ["/film/intro-wide.v1.mp4", "video/mp4", MOTION],
]
  .map(([src, type, media]) => `<source src="${src}" type='${type}' media="${media}">`)
  .join("");

// Runs as the shell is parsed, before the video's resource selection starts fetching.
const SHELL = `(function(){
var d=document.documentElement,v=document.querySelector("#rv-film video");if(!v)return;
var n=navigator.connection||{},m=location.pathname.match(/^\\/t\\/([^\\/?#]+)/),why="";
try{why=!m?"not a review page":matchMedia("(prefers-reduced-motion: reduce)").matches?"reduced motion":n.saveData?"data saver":/2g/.test(n.effectiveType||"")?"slow connection ("+n.effectiveType+")":(!/[?&]preview=1(&|$)/.test(location.search)&&sessionStorage.getItem("reputra:intro:"+m[1].toUpperCase()))?"already played in this tab":""}catch(e){}
if(why){d.dataset.rvFilmWhy=why;while(v.firstChild)v.removeChild(v.firstChild);v.load();return}
v.muted=true;try{var p=v.play();if(p)p.then(function(){if(!v.dataset.claimed){v.pause();v.currentTime=0}},function(){})}catch(e){}
})()`;

export function FilmStage() {
  return (
    // The film's scripts start, trim or stop the video before React hydrates, on purpose.
    <div
      className="contents"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `<div id="rv-film" class="rv-film" aria-hidden="true"><video muted playsinline disablepictureinpicture preload="auto">${SOURCES}</video></div><script>${SHELL}</script>`,
      }}
    />
  );
}

export function Intro({ enabled, name, slug, force, thanks }: { enabled: boolean; name: string; slug: string; force: boolean; thanks: Record<string, string> }) {
  const controller = `(function(){
var d=document.documentElement,f=document.getElementById("rv-film"),t=document.currentScript.previousElementSibling,K=${JSON.stringify(`reputra:intro:${slug}`)};
if(!f)return;var v=f.querySelector("video");
function set(p){d.dataset.rvIntro=p}
function stop(){v.pause();while(v.firstChild)v.removeChild(v.firstChild);v.removeAttribute("src");v.load()}
var why="";
try{why=${enabled ? '""' : '"turned off in Settings"'}||(matchMedia("(prefers-reduced-motion: reduce)").matches?"reduced motion":"")${force ? "" : `||(sessionStorage.getItem(K)?"already played in this tab":"")`};
if(why){set("off");d.dataset.rvIntroWhy=why;stop();t.remove();return}sessionStorage.setItem(K,"1")}catch(e){}
f.appendChild(t);
try{var l=localStorage.getItem("reputra:lang"),T=${JSON.stringify(thanks)};if(l&&T[l]){t.querySelector(".rv-film-thanks").textContent=T[l];if(l==="ur")t.dir="rtl"}}catch(e){}
var phase="wait",stall=0;
function title(){if(phase!=="wait"&&phase!=="on")return;if(phase==="wait"){d.dataset.rvIntroFilm="no";stop()}phase="title";set("title");setTimeout(lift,720)}
function card(why){if(phase==="wait")d.dataset.rvIntroWhy=why;title()}
function lift(){if(phase==="lift"||phase==="done"||phase==="off")return;phase="lift";set("lift");setTimeout(function(){phase="done";set("done");stop()},620)}
function skip(){if(phase==="wait"){phase="off";set("off");stop()}else lift()}
if(!v.querySelector("source")||v.networkState===3){card(d.dataset.rvFilmWhy||"film failed")}else{
set("wait");v.dataset.claimed="1";
v.addEventListener("playing",function(){clearTimeout(stall)});
v.addEventListener("waiting",function(){if(phase==="on"){clearTimeout(stall);stall=setTimeout(title,300)}});
v.addEventListener("timeupdate",function(){if(v.currentTime>=1.72)title()});
v.addEventListener("ended",title);v.addEventListener("error",function(){card("film failed")},true);
setTimeout(function(){if(phase==="wait")card("film not ready in time")},${force ? 6000 : 500});
(function shown(){if(phase!=="wait")return;if(!v.paused&&v.currentTime>0&&v.readyState>2){phase="on";set("on")}else requestAnimationFrame(shown)})();
v.muted=true;if(v.currentTime>0)v.currentTime=0;var p=v.play();if(p&&p.catch)p.catch(function(){card("film blocked")})}
f.addEventListener("pointerdown",skip);addEventListener("pointerdown",function(e){if(phase==="wait")skip()},{once:true});addEventListener("keydown",skip,{once:true});
})()`;

  const html = enabled
    ? `<div class="rv-film-title">` +
      `<span class="rv-film-line"><span class="rv-film-thanks">${esc(thanks.roman)}</span></span>` +
      `<span class="rv-film-line"><span class="rv-film-name" style="--len:${Math.max(name.length, 8)}">${esc(name)}</span></span>` +
      `</div><script>${controller}</script>`
    : `<i hidden></i><script>${controller}</script>`;

  // The inline script moves the title card into the film before React hydrates, so this
  // container's HTML differs from the server's on purpose.
  return <div className="contents" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}
