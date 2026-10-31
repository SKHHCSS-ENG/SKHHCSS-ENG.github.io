/**
 * English subject site — student-facing build label.
 *
 * One file for every page. The footer script reads `sha` and `date` below.
 * What's New echoes the same label (see whats-new/index.html).
 *
 * Nest, on each ship:
 * 1. Finish the content commit. That commit is the one Howard should revert to.
 * 2. Set `sha` in this file to its 7-character id (`git rev-parse --short=7 HEAD`).
 * 3. Set `date` in this file to that commit's Asia/Hong_Kong calendar day, English
 *    short month, no leading zero: `22 Oct 2026`
 *    (`TZ=Asia/Hong_Kong date '+%-d %b %Y'` in an English locale).
 * 4. Stop there for the stamp. Set `sha` and `date` in this file only (plus
 *    What's New when that note is folded into the feature tip). Do not rewrite
 *    every page's `site-version.js?v=`. Pages keep `?v=sv`. Phones may need one
 *    refresh after a stamp if the old JS was cached hard. That is an acceptable
 *    tradeoff.
 * 5. What's New end-of-day: under the newest date only, keep one line
 *    `<p class="release-version" data-site-version-echo>Site version: <span data-site-version-label>…</span></p>`
 *    and put the same `sha · date` text in the span. Move the line forward
 *    when a new day is added. It is not an Added / Changed / Fixed bullet.
 *    This script also fills `[data-site-version-label]` from `sha` and `date`,
 *    so the footer and What's New stay on the same build after the page loads.
 *
 * The label is the content commit, not the tiny follow-up that writes the label
 * (a file cannot contain its own commit id). Match it on GitHub, then revert
 * to that sha.
 */
(function () {
  var sha = "4b32508";
  var date = "31 Oct 2026";
  var label = sha + " \u00b7 " + date;

  window.SITE_VERSION = {
    sha: sha,
    date: date,
    label: label
  };

  var LINE = "Site version: " + label;

  function ensureStyle() {
    if (document.getElementById("site-version-style")) return;
    var style = document.createElement("style");
    style.id = "site-version-style";
    style.textContent = [
      ".site-version-line{display:block;margin-top:4px;font-size:.72rem;font-weight:500;line-height:1.35;color:#64748b;text-align:center;overflow-wrap:anywhere;user-select:text;-webkit-user-select:text;}",
      ".school-brand .site-version-line{margin-top:2px;font-size:inherit;font-weight:500;color:inherit;}",
      ".site-version-footer{flex:1 0 100%;width:100%;box-sizing:border-box;margin:0;padding:12px 16px calc(16px + env(safe-area-inset-bottom, 0px));border-top:1px solid #d3e8ef;font-size:.78rem;line-height:1.4;color:#64748b;text-align:center;}",
      ".site-version-footer .site-version-line{margin-top:0;}",
      "@media print{.site-version-line{color:#334155;}}"
    ].join("");
    document.head.appendChild(style);
  }

  function fillEchoes() {
    var nodes = document.querySelectorAll("[data-site-version-echo] [data-site-version-label]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = label;
    }
  }

  function injectFooter() {
    if (document.querySelector(".site-version-line")) return;

    var line = document.createElement("span");
    line.className = "site-version-line";
    line.setAttribute("data-site-version", sha);
    line.textContent = LINE;

    var footer = document.querySelector("footer, .site-footer");
    if (footer) {
      footer.appendChild(line);
      return;
    }

    var brand = document.querySelector(".school-brand");
    if (brand) {
      brand.appendChild(line);
      return;
    }

    var created = document.createElement("footer");
    created.className = "site-footer site-version-footer";
    created.appendChild(line);
    document.body.appendChild(created);
  }

  function run() {
    ensureStyle();
    fillEchoes();
    injectFooter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
