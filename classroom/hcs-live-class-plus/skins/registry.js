/**
 * HCS Live Class + skin packs.
 *
 * Default and Minimalist live on the Plus page. Every other skin is a pack:
 * add skins/<id>.css and skins/<id>.js, then push one row onto `packs`.
 * The page loads this list. It does not need a new style block or button.
 *
 * A pack row:
 *   id        data-skin value and localStorage id
 *   label     SKIN button text
 *   buttonId  DOM id (Spark keeps btnSkinSpark so Ask can click it)
 *   css       stylesheet, after the page style so it wins equal-specificity ties
 *   js        calls HcsSkinHost.register. Loaded after spark-fire.js
 */
(function (root) {
  var packs = [
    {
      id: 'spark',
      label: 'Spark',
      buttonId: 'btnSkinSpark',
      css: 'skins/spark.css',
      js: 'skins/spark.js'
    },
    {
      id: 'arcade',
      label: 'Arcade',
      buttonId: 'btnSkinArcade',
      css: 'skins/arcade.css',
      js: 'skins/arcade.js'
    },
    {
      id: 'holo',
      label: 'Holo',
      buttonId: 'btnSkinHolo',
      css: 'skins/holo.css',
      js: 'skins/holo.js'
    },
    {
      id: 'hyper',
      label: 'Hyper',
      buttonId: 'btnSkinHyper',
      css: 'skins/hyper.css',
      js: 'skins/hyper.js'
    },
    {
      id: 'pixel',
      label: 'Pixel',
      buttonId: 'btnSkinPixel',
      css: 'skins/pixel.css',
      js: 'skins/pixel.js'
    },
    {
      id: 'cyber',
      label: 'Cyber',
      buttonId: 'btnSkinCyber',
      css: 'skins/cyber.css',
      js: 'skins/cyber.js'
    },
    {
      id: 'lofi',
      label: 'Lo-Fi',
      buttonId: 'btnSkinLofi',
      css: 'skins/lofi.css',
      js: 'skins/lofi.js'
    }
  ];

  function known(id) {
    if (!id) return false;
    for (var i = 0; i < packs.length; i++) {
      if (packs[i] && packs[i].id === id) return true;
    }
    return false;
  }

  root.HcsSkinRegistry = {
    packs: packs,
    known: known
  };

  if (typeof module === 'object' && module.exports) module.exports = root.HcsSkinRegistry;
})(typeof globalThis !== 'undefined' ? globalThis : this);
