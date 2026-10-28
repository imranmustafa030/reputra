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
// <Intro> streams in with the business and takes control with an inline script (before React,
// which never touches either half while hydrating). It decides: not if the owner turned it off;
// never for reduced motion or Data Saver; not on a connection the browser classes as 2G or 3G;
// once per tab (coming back from Google doesn't replay it). It only reads the browser's class of
// connection, never its raw speed figure: that is a rough estimate and reads low on perfectly fast
// lines. The owner's preview link ignores the connection and the once-per-tab rule, so it always
// plays (it also waits up to 6s for the film, where a customer gets 1.3s). When it says no, the
// download is cancelled and <html data-rv-intro-why> says why. If the film still hasn't started
// 1.3s later, it is dropped and the page opens at once: no customer waits on a black screen for an
// intro. Phases live on <html data-rv-intro>: on → title → lift → done,
// or off.

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

export function FilmStage() {
  return (
    // The film's script starts, trims or stops the video before React hydrates, on purpose.
    <div
      className="contents"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{
        __html: `<div id="rv-film" class="rv-film" aria-hidden="true"><video muted playsinline disablepictureinpicture preload="auto">${SOURCES}</video></div>`,
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
var n=navigator.connection||{},why="";
try{why=${enabled ? '""' : '"turned off in Settings"'}||(matchMedia("(prefers-reduced-motion: reduce)").matches?"reduced motion":"")||(n.saveData?"data saver":"")${force ? "" : `||(/2g|3g/.test(n.effectiveType||"")?"slow connection ("+n.effectiveType+")":"")||(sessionStorage.getItem(K)?"already played in this tab":"")`};
if(why){set("off");d.dataset.rvIntroWhy=why;stop();t.remove();return}sessionStorage.setItem(K,"1")}catch(e){}
f.appendChild(t);
try{var l=localStorage.getItem("reputra:lang"),T=${JSON.stringify(thanks)};if(l&&T[l]){t.querySelector(".rv-film-thanks").textContent=T[l];if(l==="ur")t.dir="rtl"}}catch(e){}
var phase="on",started=v.currentTime>0;set("on");
function title(){if(phase!=="on")return;phase="title";set("title");setTimeout(lift,720)}
function lift(){if(phase==="lift"||phase==="done")return;phase="lift";set("lift");setTimeout(function(){phase="done";set("done");stop()},620)}
function fail(){if(started)title();else lift()}
v.addEventListener("playing",function(){started=1});
v.addEventListener("timeupdate",function(){if(v.currentTime>=1.72)title()});
v.addEventListener("ended",title);v.addEventListener("error",fail,true);
setTimeout(function(){if(!started){d.dataset.rvIntroWhy="film did not start in time";lift()}},${force ? 6000 : 1300});
f.addEventListener("pointerdown",lift);addEventListener("keydown",lift,{once:true});
v.muted=true;var p=v.play();if(p&&p.catch)p.catch(fail);
})()`;

  const html = enabled
    ? `<div class="rv-film-title">` +
      `<span class="rv-film-line"><span class="rv-film-thanks">${esc(thanks.en)}</span></span>` +
      `<span class="rv-film-line"><span class="rv-film-name" style="--len:${Math.max(name.length, 8)}">${esc(name)}</span></span>` +
      `</div><script>${controller}</script>`
    : `<i hidden></i><script>${controller}</script>`;

  // The inline script moves the title card into the film before React hydrates, so this
  // container's HTML differs from the server's on purpose.
  return <div className="contents" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />;
}
