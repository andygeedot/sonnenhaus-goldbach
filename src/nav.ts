// Abschnitts-Menü, Lesefortschritt, Einblenden beim Scrollen, Nach-oben-Knopf.
import { $, reduced } from "./ui";

export function initNav() {
  const links = [...document.querySelectorAll<HTMLAnchorElement>("#secnav a")];
  if ("IntersectionObserver" in window) {
    // aktiven Abschnitt im Menü markieren
    const spy = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      links.forEach(a => {
        const on = a.hash === "#" + e.target.id;
        a.classList.toggle("on", on);
        if (on) { a.setAttribute("aria-current", "true"); a.scrollIntoView({ block: "nearest", inline: "nearest" }); }
        else a.removeAttribute("aria-current");
      });
    }), { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll("main > section[id]").forEach(s => spy.observe(s));
    // Abschnitte beim Scrollen einblenden
    if (!reduced) {
      const rev = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add("in"); rev.unobserve(e.target); }
      }), { rootMargin: "0px 0px -8% 0px" });
      document.querySelectorAll("main > section:not(#start)").forEach(s => { s.classList.add("reveal"); rev.observe(s); });
    }
  }
  addEventListener("scroll", () => {
    const h = document.documentElement, p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    $("readProg").style.width = p * 100 + "%";
    $("totop").classList.toggle("show", h.scrollTop > innerHeight * 1.2);
  }, { passive: true });
}
