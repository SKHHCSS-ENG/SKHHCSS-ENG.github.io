/**
 * Skin pack list for HCS Live Class +.
 *
 * Default and Minimalist live in index.html and stay on the original
 * HCS Live Class page too. Packs listed here are Plus-only add-ons:
 * each entry supplies its own stylesheet and script under skins/.
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
      id: 'pitwall',
      label: 'Pitwall',
      buttonId: 'btnSkinPitwall',
      css: 'skins/pitwall.css',
      js: 'skins/pitwall.js'
    },
    {
      id: 'sakura',
      label: 'Sakura',
      buttonId: 'btnSkinSakura',
      css: 'skins/sakura.css',
      js: 'skins/sakura.js'
    }
  ];

  function known(id) {
    if (!id) return false;
    for (var i = 0; i < packs.length; i++) {
      if (packs[i].id === id) return true;
    }
    return false;
  }

  function byId(id) {
    for (var i = 0; i < packs.length; i++) {
      if (packs[i].id === id) return packs[i];
    }
    return null;
  }

  var api = {
    packs: packs,
    known: known,
    byId: byId
  };

  root.HcsSkinRegistry = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
