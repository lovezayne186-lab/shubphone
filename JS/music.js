// 使用第三方聚合接口 (示例地址，需具备容错处理)
const API_SEARCH = "https://api.liumingye.cn/m/api/search?q=";
const API_GET_URL = "https://api.liumingye.cn/m/api/link?id=";
const API_METING_PLAYLIST = "https://api.injahow.com/meting/?type=playlist&id=";
const API_METING_PLAYLIST_FALLBACK = "https://api.i-meto.com/meting/api?server=netease&type=playlist&id=";
const ITUNES_SEARCH = "https://itunes.apple.com/search?media=music&limit=30&term=";

(function () {
  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function clampInt(n, min, max) {
    var v = Math.round(n);
    if (v < min) return min;
    if (v > max) return max;
    return v;
  }

  var DEFAULT_COVER = "../assets/images/beijing.jpg";

  var musicApp = qs("#musicApp");
  var topSearch = qs("#topSearch");
  var searchInput = qs("#searchInput");
  var searchClear = qs("#searchClear");
  var searchCancel = qs("#searchCancel");
  var playlistImportBtn = qs("#playlistImportBtn");
  var recommendView = qs("#recommend-view");
  var searchView = qs("#search-view");
  var searchList = qs("#searchList");
  var searchHint = qs("#searchHint");

  var miniPlayer = qs("#miniPlayer");
  var miniOpen = qs("#miniOpen");
  var miniCover = qs("#miniCover");
  var miniTitle = qs("#miniTitle");
  var miniArtist = qs("#miniArtist");
  var miniPlayBtn = qs("#miniPlayBtn");

  var toastEl = qs("#toast");

  var playerSheet = qs("#playerSheet");
  if (!playerSheet) return;

  var waveEl = qs("#wave");
  var playBtn = qs("#playBtn");
  var modeBtn = qs("#modeBtn");
  var prevBtn = qs("#prevBtn");
  var nextBtn = qs("#nextBtn");
  var closeBtn = qs("#closePlayer");

  var coverImg = qs("#coverImg");
  var trackTitle = qs("#trackTitle");
  var trackArtist = qs("#trackArtist");

  var tabs = qsa(".tab");
  var homePlaylist = qs("#homePlaylist");

  var audioEl = qs("#audioEl");

  var modeList = [
    { key: "shuffle", icon: "bx-shuffle", label: "随机播放" },
    { key: "single", icon: "bx-repeat", label: "单曲循环" },
    { key: "loop", icon: "bx-refresh", label: "列表循环" },
  ];

  var STORAGE_KEY = "music_library_v1";
  var NETEASE_OUTER_URL = "https://music.163.com/song/media/outer/url?id=";

  var state = {
    queue: [],
    library: [],
    queueMode: "library",
    currentIndex: 0,
    isPlaying: false,
    modeIndex: 0,
    barCount: 0,
    progressCount: 0,
    bars: [],
    toastTimer: null,
    playCtx: null,
  };

  function safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  function loadLibrary() {
    try {
      var raw = window.localStorage ? localStorage.getItem(STORAGE_KEY) : "";
      if (!raw) return [];
      var data = safeJsonParse(raw);
      if (!Array.isArray(data)) return [];
      return data
        .map(function (x) {
          if (!x || typeof x !== "object") return null;
          var title = x.title ? String(x.title) : "";
          var id = x.id ? String(x.id) : "";
          var url = x.url ? String(x.url) : "";
          if (!title) return null;
          if (!id && !url) return null;
          return {
            id: id,
            title: title,
            artist: x.artist ? String(x.artist) : "未知歌手",
            cover: x.cover ? String(x.cover) : DEFAULT_COVER,
            url: url,
            disabled: !!x.disabled,
          };
        })
        .filter(function (x) {
          return !!x;
        });
    } catch (e) {
      return [];
    }
  }

  function saveLibrary() {
    try {
      if (!window.localStorage) return;
      var payload = (state.library || []).map(function (s) {
        return {
          id: s && s.id ? String(s.id) : "",
          title: s && s.title ? String(s.title) : "",
          artist: s && s.artist ? String(s.artist) : "",
          cover: s && s.cover ? String(s.cover) : "",
          url: s && s.url ? String(s.url) : "",
          disabled: !!(s && s.disabled),
        };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {}
  }

  function getActiveLibrary() {
    return (state.library || [])
      .filter(function (s) {
        if (!s) return false;
        if (s.disabled) return false;
        if (s.url || s.src) return true;
        return !!s.id;
      });
  }

  function syncLibraryQueue() {
    if (state.queueMode !== "library") return;
    state.queue = getActiveLibrary().slice();
    if (state.currentIndex >= state.queue.length) state.currentIndex = 0;
  }

  function rebuildQueue() {
    syncLibraryQueue();
  }

  function ensureLatestServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    var key = "__music_sw_reloaded__";
    navigator.serviceWorker
      .getRegistrations()
      .then(function (regs) {
        if (!regs || !regs.length) return null;
        return Promise.all(
          regs.map(function (reg) {
            if (!reg) return null;
            return reg
              .update()
              .catch(function () {})
              .then(function () {
                return reg;
              });
          })
        );
      })
      .then(function (regs) {
        if (!regs || !regs.length) return;
        regs.forEach(function (reg) {
          if (!reg) return;
          if (reg.waiting) {
            try {
              reg.waiting.postMessage({ type: "SKIP_WAITING" });
            } catch (e) {}
          }
        });
      })
      .catch(function () {});

    navigator.serviceWorker.addEventListener("controllerchange", function () {
      try {
        if (window.sessionStorage && sessionStorage.getItem(key) === "1") return;
        if (window.sessionStorage) sessionStorage.setItem(key, "1");
      } catch (e) {}
      window.location.reload();
    });
  }

  function renderHomePlaylist() {
    if (!homePlaylist) return;
    var list = getActiveLibrary();
    homePlaylist.innerHTML = "";

    if (!list.length) {
      var empty = document.createElement("div");
      empty.className = "home-empty";
      empty.textContent = "暂无歌曲";
      homePlaylist.appendChild(empty);
      return;
    }

    list.forEach(function (song, index) {
      var btn = document.createElement("button");
      btn.className = "playlist-item";
      btn.type = "button";
      btn.dataset.index = String(index);

      var cover = document.createElement("div");
      cover.className = "playlist-cover";
      var coverUrl = song && song.cover ? String(song.cover) : "";
      if (coverUrl) {
        cover.style.backgroundImage = 'url("' + coverUrl.replace(/"/g, "") + '")';
        cover.style.backgroundSize = "cover";
        cover.style.backgroundPosition = "center";
      } else {
        if (index % 3 === 1) cover.classList.add("alt");
        if (index % 3 === 2) cover.classList.add("alt2");
      }

      var meta = document.createElement("div");
      meta.className = "playlist-meta";
      var name = document.createElement("div");
      name.className = "playlist-name";
      name.textContent = (song && song.title) || "未知歌曲";
      var desc = document.createElement("div");
      desc.className = "playlist-desc";
      desc.textContent = (song && song.artist) || "未知歌手";
      meta.appendChild(name);
      meta.appendChild(desc);

      btn.appendChild(cover);
      btn.appendChild(meta);
      homePlaylist.appendChild(btn);
    });
  }

  function showToast(text) {
    if (!toastEl) return;
    if (state.toastTimer) window.clearTimeout(state.toastTimer);
    toastEl.textContent = String(text || "");
    toastEl.classList.add("is-active");
    state.toastTimer = window.setTimeout(function () {
      toastEl.classList.remove("is-active");
    }, 1800);
  }

  function setSearchActive(active) {
    if (topSearch) topSearch.classList.toggle("is-active", !!active);
    if (musicApp) musicApp.classList.toggle("is-searching", !!active);
    if (recommendView) recommendView.classList.toggle("is-active", !active);
    if (searchView) searchView.classList.toggle("is-active", !!active);
  }

  function setClearVisible(visible) {
    if (!searchClear) return;
    searchClear.style.display = visible ? "grid" : "none";
  }

  function openPlayer() {
    playerSheet.classList.add("active");
    playerSheet.setAttribute("aria-hidden", "false");
  }

  function closePlayer() {
    playerSheet.classList.remove("active");
    playerSheet.setAttribute("aria-hidden", "true");
  }

  function setActiveTab(tabName) {
    tabs.forEach(function (btn) {
      btn.classList.toggle("is-active", btn.dataset.tab === tabName);
    });
  }

  function setModeByIndex(nextIndex) {
    state.modeIndex = nextIndex % modeList.length;
    var mode = modeList[state.modeIndex];
    var icon = qs("i", modeBtn);
    if (icon) icon.className = "bx " + mode.icon;
    if (modeBtn) {
      modeBtn.setAttribute("aria-label", mode.label);
      modeBtn.title = mode.label;
    }
  }

  function setPlayIcon(isPlaying) {
    var icon = qs("i", playBtn);
    if (icon) icon.className = isPlaying ? "bx bx-pause" : "bx bx-play";
    if (playBtn) playBtn.setAttribute("aria-label", isPlaying ? "暂停" : "播放");

    var miniIcon = miniPlayBtn ? qs("i", miniPlayBtn) : null;
    if (miniIcon) miniIcon.className = isPlaying ? "bx bx-pause" : "bx bx-play";
    if (miniPlayBtn) miniPlayBtn.setAttribute("aria-label", isPlaying ? "暂停" : "播放");
  }

  function setPlaying(nextPlaying) {
    if (!audioEl) return;

    if (nextPlaying) {
      var p = audioEl.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () {
          showToast("点击播放继续");
        });
      }
    } else {
      audioEl.pause();
    }
  }

  function applyTrackInfo(songInfo) {
    var cover = songInfo && songInfo.cover ? songInfo.cover : DEFAULT_COVER;
    var title = songInfo && songInfo.title ? songInfo.title : "未知歌曲";
    var artist = songInfo && songInfo.artist ? songInfo.artist : "未知歌手";

    if (coverImg) coverImg.src = cover;
    if (trackTitle) trackTitle.textContent = title;
    if (trackArtist) trackArtist.textContent = artist;

    if (miniCover) miniCover.src = cover;
    if (miniTitle) miniTitle.textContent = title;
    if (miniArtist) miniArtist.textContent = artist;

    if (miniPlayer) {
      miniPlayer.classList.add("is-active");
      miniPlayer.setAttribute("aria-hidden", "false");
    }
  }

  function setLoading(loading) {
    if (!playBtn) return;
    playBtn.disabled = !!loading;
    playBtn.setAttribute("aria-busy", loading ? "true" : "false");
    var icon = qs("i", playBtn);
    if (!icon) return;
    if (loading) icon.className = "bx bx-loader-alt bx-spin";
    else icon.className = state.isPlaying ? "bx bx-pause" : "bx bx-play";
  }

  function mulberry32(seed) {
    var t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      var r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function computeBarCount() {
    if (!waveEl) return 0;
    var rect = waveEl.getBoundingClientRect();
    var w = rect.width || 0;
    if (w <= 0) return 0;
    var barWidth = 3;
    var gap = 3;
    var count = Math.floor((w + gap) / (barWidth + gap));
    return clampInt(count, 28, 64);
  }

  function renderWave() {
    state.bars.forEach(function (barEl, i) {
      barEl.classList.toggle("filled", i < state.progressCount);
    });
  }

  function updateWaveFromAudio() {
    if (!audioEl || !state.barCount) return;
    var duration = audioEl.duration;
    if (!duration || !isFinite(duration) || duration <= 0) return;
    var ratio = audioEl.currentTime / duration;
    state.progressCount = clampInt(ratio * state.barCount, 0, state.barCount);
    renderWave();
  }

  function buildWaveBars() {
    if (!waveEl) return;
    waveEl.innerHTML = "";

    var rnd = mulberry32(0x13579bdf);
    var count = computeBarCount();
    if (!count) count = 40;
    state.barCount = count;
    var bars = [];
    for (var i = 0; i < state.barCount; i += 1) {
      var h = 8 + Math.round(rnd() * 28);
      if (h < 10) h = 10;
      if (h > 36) h = 36;
      var bar = document.createElement("span");
      bar.className = "bar";
      bar.style.setProperty("--h", h + "px");
      bars.push(bar);
      waveEl.appendChild(bar);
    }
    state.bars = bars;
    if (state.progressCount > state.barCount) state.progressCount = state.barCount;
    renderWave();
    updateWaveFromAudio();
  }

  function scheduleWaveRebuild() {
    window.requestAnimationFrame(function () {
      buildWaveBars();
    });
  }

  function extractSearchArray(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (typeof payload !== "object") return [];

    var candidates = [
      payload.data,
      payload.result,
      payload.results,
      payload.songs,
      payload.list,
      payload.items,
      payload.data && payload.data.list,
      payload.data && payload.data.songs,
      payload.data && payload.data.results,
      payload.result && payload.result.songs,
      payload.result && payload.result.list,
    ];

    for (var i = 0; i < candidates.length; i += 1) {
      if (Array.isArray(candidates[i])) return candidates[i];
    }

    var keys = Object.keys(payload);
    for (var j = 0; j < keys.length; j += 1) {
      var v = payload[keys[j]];
      if (Array.isArray(v)) return v;
      if (v && typeof v === "object") {
        var inner = extractSearchArray(v);
        if (inner.length) return inner;
      }
    }
    return [];
  }

  function normalizeSong(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = raw.id || raw.songid || raw.songId || raw.ID || raw.trackId || raw.trackID || raw.track_id;
    var title = raw.title || raw.name || raw.songname || raw.songName || raw.trackName || raw.track_name;
    var author =
      raw.author || raw.artist || raw.singer || raw.artistname || raw.artistName || raw.singerName || raw.artist_name;
    var pic = raw.pic || raw.cover || raw.picUrl || raw.img || raw.image || raw.artworkUrl100 || raw.artworkUrl60;
    var url = raw.url || raw.playUrl || raw.play_url || raw.mp3 || raw.musicUrl;
    if (!url && raw.previewUrl) url = raw.previewUrl;
    if (!id || !title) return null;
    return {
      id: String(id),
      title: String(title),
      artist: author ? String(author) : "未知歌手",
      cover: pic ? String(pic).replace(/^http:\/\//i, "https://") : DEFAULT_COVER,
      url: url ? String(url).replace(/^http:\/\//i, "https://") : "",
    };
  }

  function normalizeMetingTrack(raw) {
    if (!raw || typeof raw !== "object") return null;
    var id = raw.id || raw.url_id || raw.urlId || raw.song_id || raw.songId;
    var title = raw.title || raw.name;
    var artist = raw.artist || raw.author || raw.singer;
    var cover = raw.cover || raw.pic;
    var url = raw.url || raw.mp3 || raw.playUrl || raw.play_url;
    if (!title) return null;
    if (!id && !url) return null;
    return {
      id: id ? String(id) : "",
      title: String(title),
      artist: artist ? String(artist) : "未知歌手",
      cover: cover ? String(cover).replace(/^http:\/\//i, "https://") : DEFAULT_COVER,
      url: url ? String(url).replace(/^http:\/\//i, "https://") : "",
    };
  }

  function clearSearchList() {
    if (!searchList) return;
    searchList.innerHTML = "";
  }

  function renderSearchList(songs) {
    if (!searchList) return;
    clearSearchList();

    if (!songs || !songs.length) {
      if (searchHint) searchHint.textContent = "未找到结果";
      return;
    }

    if (searchHint) searchHint.textContent = "";

    songs.forEach(function (song, index) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "search-item";
      btn.dataset.id = song.id;
      btn.dataset.index = String(index);

      var cover = document.createElement("div");
      cover.className = "search-cover";
      var img = document.createElement("img");
      img.alt = "";
      img.loading = "lazy";
      img.src = song.cover || DEFAULT_COVER;
      cover.appendChild(img);

      var meta = document.createElement("div");
      meta.className = "search-meta";
      var title = document.createElement("div");
      title.className = "search-title";
      title.textContent = song.title;
      var artist = document.createElement("div");
      artist.className = "search-artist";
      artist.textContent = song.artist || "未知歌手";
      meta.appendChild(title);
      meta.appendChild(artist);

      var play = document.createElement("div");
      play.className = "search-play";
      var icon = document.createElement("i");
      icon.className = "bx bx-play";
      play.appendChild(icon);

      btn.appendChild(cover);
      btn.appendChild(meta);
      btn.appendChild(play);

      btn.addEventListener("click", function () {
        state.queueMode = "search";
        state.queue = songs.slice();
        var idx = Number(btn.dataset.index || 0);
        state.currentIndex = idx;
        playSongById(song.id, song);
      });

      li.appendChild(btn);
      searchList.appendChild(li);
    });
  }

  function fetchJson(url, timeoutMs) {
    function createAbort(timeoutMs) {
      var controller = null;
      var signal = null;
      try {
        controller = new AbortController();
        signal = controller.signal;
      } catch (e) {}

      var timeout = null;
      if (controller && timeoutMs) {
        timeout = window.setTimeout(function () {
          try {
            controller.abort();
          } catch (e) {}
        }, timeoutMs);
      }

      return { signal: signal, timeout: timeout };
    }

    function parseResponseAsJson(res) {
      return res
        .text()
        .then(function (text) {
          try {
            return JSON.parse(text);
          } catch (e) {
            throw new Error("invalid_json");
          }
        })
        .catch(function () {
          return res.json();
        });
    }

    var isNullOrigin = false;
    try {
      isNullOrigin = window.location.protocol === "file:" || window.location.origin === "null";
    } catch (e) {}

    var builders = isNullOrigin
      ? [
          function (u) {
            return "https://corsproxy.io/?" + encodeURIComponent(u);
          },
          function (u) {
            return "https://api.allorigins.win/raw?url=" + encodeURIComponent(u);
          },
          function (u) {
            return "https://cors.isomorphic-git.org/" + u;
          },
          function (u) {
            return "https://thingproxy.freeboard.io/fetch/" + u;
          },
          function (u) {
            return u;
          },
        ]
      : [
          function (u) {
            return u;
          },
          function (u) {
            return "https://corsproxy.io/?" + encodeURIComponent(u);
          },
          function (u) {
            return "https://api.allorigins.win/raw?url=" + encodeURIComponent(u);
          },
          function (u) {
            return "https://cors.isomorphic-git.org/" + u;
          },
          function (u) {
            return "https://thingproxy.freeboard.io/fetch/" + u;
          },
        ];

    function attempt(i) {
      var targetUrl = builders[i] ? builders[i](url) : url;
      var abort = createAbort(timeoutMs);
      return fetch(targetUrl, { signal: abort.signal })
        .then(function (res) {
          if (!res.ok) throw new Error("http_" + res.status);
          return parseResponseAsJson(res);
        })
        .catch(function (err) {
          if (i + 1 >= builders.length) throw err;
          return attempt(i + 1);
        })
        .finally(function () {
          if (abort.timeout) window.clearTimeout(abort.timeout);
        });
    }

    return attempt(0);
  }

  function fetchJsonp(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var cb = "__jsonp_cb_" + String(Date.now()) + "_" + String(Math.floor(Math.random() * 1e9));
      var done = false;
      var script = document.createElement("script");

      function cleanup() {
        if (script && script.parentNode) script.parentNode.removeChild(script);
        try {
          delete window[cb];
        } catch (e) {
          window[cb] = undefined;
        }
      }

      var timer = null;
      if (timeoutMs) {
        timer = window.setTimeout(function () {
          if (done) return;
          done = true;
          cleanup();
          reject(new Error("timeout"));
        }, timeoutMs);
      }

      window[cb] = function (data) {
        if (done) return;
        done = true;
        if (timer) window.clearTimeout(timer);
        cleanup();
        resolve(data);
      };

      script.onerror = function () {
        if (done) return;
        done = true;
        if (timer) window.clearTimeout(timer);
        cleanup();
        reject(new Error("load_error"));
      };

      var sep = url.indexOf("?") >= 0 ? "&" : "?";
      script.src = url + sep + "callback=" + encodeURIComponent(cb);
      document.head.appendChild(script);
    });
  }

  function pickUrl(payload) {
    if (!payload) return "";
    if (typeof payload === "string") return payload;
    var direct = payload.url || payload.link;
    if (direct) return String(direct);
    var data = payload.data || payload.result;
    if (data && (data.url || data.link)) return String(data.url || data.link);
    if (data && typeof data === "string") return data;
    return "";
  }

  function playUrl(url) {
    if (!audioEl) return;
    var u = String(url || "").trim();
    if (!u) {
      showToast("该歌曲无可用音源");
      return;
    }
    audioEl.src = u;
    setPlaying(true);
  }

  function trackKey(song) {
    if (!song) return "";
    if (song.id) return "id:" + String(song.id);
    if (song.url || song.src) return "u:" + String(song.url || song.src);
    var t = String(song.title || "").trim().toLowerCase();
    var a = String(song.artist || "").trim().toLowerCase();
    if (!t) return "";
    return "ta:" + t + "::" + a;
  }

  function findLibrarySongIndex(song) {
    if (!song) return -1;
    var key = trackKey(song);
    if (!key) return -1;
    var list = state.library || [];
    for (var i = 0; i < list.length; i += 1) {
      if (trackKey(list[i]) === key) return i;
    }
    return -1;
  }

  function disableSong(song) {
    var i = findLibrarySongIndex(song);
    if (i < 0) return;
    if (!state.library[i]) return;
    state.library[i].disabled = true;
    saveLibrary();
    rebuildQueue();
    renderHomePlaylist();
  }

  function playNextAfterDisable(prevIndex) {
    rebuildQueue();
    if (!state.queue.length) return;
    var next = prevIndex;
    if (next >= state.queue.length) next = state.queue.length - 1;
    if (next < 0) next = 0;
    playQueueIndex(next);
  }

  function ensureCurrentTrackInfo() {
    var current = state.queue[state.currentIndex];
    if (!current) return null;
    applyTrackInfo(current);
    return current;
  }

  function playQueueIndex(index) {
    if (!state.queue.length) {
      showToast("暂无歌曲");
      return;
    }
    var next = state.queue[index];
    if (!next) return;
    state.currentIndex = index;

    if (next.id) {
      playSongById(next.id, next);
    } else {
      openPlayer();
      setActiveTab("play");
      applyTrackInfo(next);
      scheduleWaveRebuild();
      playUrl(next.url || next.src);
    }
  }

  function computeNextIndex(delta) {
    if (!state.queue.length) return 0;
    var modeKey = modeList[state.modeIndex].key;
    if (modeKey === "shuffle") return Math.floor(Math.random() * state.queue.length);
    return (state.currentIndex + delta + state.queue.length) % state.queue.length;
  }

  function handleTrackEnd() {
    var modeKey = modeList[state.modeIndex].key;
    if (modeKey === "single") {
      if (audioEl) audioEl.currentTime = 0;
      setPlaying(true);
      return;
    }
    playQueueIndex(computeNextIndex(1));
  }

  function playSongById(id, songInfo) {
    openPlayer();
    setActiveTab("play");
    applyTrackInfo(songInfo);
    scheduleWaveRebuild();
    setLoading(true);

    var directUrl = songInfo && (songInfo.url || songInfo.src) ? String(songInfo.url || songInfo.src) : "";
    if (directUrl) {
      state.playCtx = { key: trackKey(songInfo), triedApi: false, triedOuter: false };
      playUrl(directUrl);
      setLoading(false);
      return;
    }

    var linkUrl = API_GET_URL + encodeURIComponent(String(id || ""));

    fetchJson(linkUrl, 10000)
      .then(function (payload) {
        var url = pickUrl(payload);
        if (!url) throw new Error("empty_url");
        state.playCtx = { key: trackKey(songInfo), triedApi: true, triedOuter: false };
        playUrl(url);
      })
      .catch(function () {
        state.playCtx = { key: trackKey(songInfo), triedApi: true, triedOuter: true };
        playUrl(NETEASE_OUTER_URL + encodeURIComponent(String(id || "")) + ".mp3");
      })
      .finally(function () {
        setLoading(false);
      });
  }

  function parseSongsFromPayload(payload) {
    var list = extractSearchArray(payload);
    return list
      .map(normalizeSong)
      .filter(function (x) {
        return !!x;
      });
  }

  function doSearch(keyword) {
    var q = String(keyword || "").trim();
    if (!q) {
      if (searchHint) searchHint.textContent = "请输入关键词";
      clearSearchList();
      return;
    }

    setSearchActive(true);
    if (searchHint) searchHint.textContent = "搜索中...";
    clearSearchList();

    var searchUrl = API_SEARCH + encodeURIComponent(q);
    var fallbackUrl = ITUNES_SEARCH + encodeURIComponent(q);
    fetchJson(searchUrl, 10000)
      .then(function (payload) {
        var songs = parseSongsFromPayload(payload);
        if (songs.length) {
          renderSearchList(songs);
          return;
        }
        return fetchJsonp(fallbackUrl, 10000).then(function (payload2) {
          renderSearchList(parseSongsFromPayload(payload2));
        });
      })
      .catch(function () {
        fetchJsonp(fallbackUrl, 10000)
          .then(function (payload) {
            renderSearchList(parseSongsFromPayload(payload));
          })
          .catch(function () {
            if (searchHint) searchHint.textContent = "搜索失败（可能是接口被拦截）";
            showToast("搜索失败");
          });
      });
  }

  function importPlaylist(playlistId) {
    var pid = String(playlistId || "").trim();
    if (!pid) {
      showToast("请输入歌单 ID");
      return;
    }

    showToast("正在解析歌单...");
    var isNullOrigin = false;
    try {
      isNullOrigin = window.location.protocol === "file:" || window.location.origin === "null";
    } catch (e) {}

    var urls = [
      API_METING_PLAYLIST + encodeURIComponent(pid),
      API_METING_PLAYLIST_FALLBACK + encodeURIComponent(pid),
    ];

    function fetchPlaylistPayload(i, lastErr) {
      if (i >= urls.length) return Promise.reject(lastErr || new Error("all_failed"));
      var u = urls[i];
      var tryJsonpFirst = isNullOrigin && u.indexOf("api.i-meto.com/meting/api") >= 0;
      var p = tryJsonpFirst ? fetchJsonp(u, 15000).catch(function () { return fetchJson(u, 15000); }) : fetchJson(u, 15000).catch(function () { return fetchJsonp(u, 15000); });
      return p.catch(function (err) {
        return fetchPlaylistPayload(i + 1, err);
      });
    }

    fetchPlaylistPayload(0)
      .then(function (payload) {
        var list = Array.isArray(payload) ? payload : extractSearchArray(payload);
        if (!Array.isArray(list) || !list.length) {
          showToast("未解析到歌曲");
          return;
        }

        var tracks = list
          .map(normalizeMetingTrack)
          .filter(function (x) {
            return !!x;
          });

        if (!tracks.length) {
          showToast("未解析到可用歌曲");
          return;
        }

        var titleKey = function (t) {
          return String(t || "")
            .trim()
            .toLowerCase();
        };
        var existing = new Set(
          state.library.map(function (s) {
            return titleKey(s && s.title);
          })
        );

        var added = [];
        tracks.forEach(function (track) {
          var key = titleKey(track.title);
          if (!key) return;
          if (existing.has(key)) return;
          existing.add(key);
          added.push(track);
        });

        if (!added.length) {
          showToast("没有可导入的新歌曲");
          renderHomePlaylist();
          return;
        }

        state.library = state.library.concat(added);
        state.queueMode = "library";
        rebuildQueue();
        saveLibrary();
        renderHomePlaylist();
        showToast("成功导入 " + added.length + " 首歌曲！");
      })
      .catch(function (err) {
        try {
          console.error("importPlaylist failed:", err);
        } catch (e) {}
        var reason = err && err.message ? String(err.message) : "";
        showToast(reason ? "歌单解析失败：" + reason : "歌单解析失败");
      });
  }

  tabs.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var tabName = btn.dataset.tab || "home";
      setActiveTab(tabName);
      if (tabName === "play") {
        openPlayer();
        scheduleWaveRebuild();
      }
    });
  });

  if (homePlaylist) {
    homePlaylist.addEventListener("click", function (e) {
      var target = e.target;
      if (!target) return;
      var btn = target.closest ? target.closest(".playlist-item") : null;
      if (!btn || !homePlaylist.contains(btn)) return;
      var index = Number(btn.dataset.index || 0);
      state.queueMode = "library";
      rebuildQueue();
      playQueueIndex(index);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("focus", function () {
      setSearchActive(true);
    });

    searchInput.addEventListener("blur", function () {
      if (!String(searchInput.value || "").trim()) setSearchActive(false);
    });

    searchInput.addEventListener("input", function () {
      setClearVisible(!!searchInput.value);
      if (!searchInput.value && searchHint) {
        searchHint.textContent = "输入关键词后回车搜索";
        clearSearchList();
      }
    });

    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        doSearch(searchInput.value);
      }
    });
  }

  if (searchClear) {
    searchClear.addEventListener("click", function () {
      if (!searchInput) return;
      searchInput.value = "";
      setClearVisible(false);
      if (searchHint) searchHint.textContent = "输入关键词后回车搜索";
      clearSearchList();
      searchInput.focus();
    });
  }

  if (searchCancel) {
    searchCancel.addEventListener("click", function () {
      if (searchInput) {
        searchInput.value = "";
        searchInput.blur();
      }
      setClearVisible(false);
      if (searchHint) searchHint.textContent = "输入关键词后回车搜索";
      clearSearchList();
      setSearchActive(false);
    });
  }

  if (playlistImportBtn) {
    playlistImportBtn.addEventListener("click", function () {
      var pid = window.prompt("请输入网易云歌单 ID (例如: 24381616)");
      if (pid === null) return;
      var v = String(pid || "").trim();
      if (!v) return;
      importPlaylist(v);
    });
  }

  playBtn.addEventListener("click", function () {
    if (!audioEl) return;
    var current = ensureCurrentTrackInfo();
    if (!audioEl.src) {
      if (!current) {
        showToast("暂无歌曲");
        return;
      }
      if (current && current.id) {
        playSongById(current.id, current);
        return;
      }
      state.playCtx = { key: trackKey(current), triedApi: true, triedOuter: true };
      playUrl(current.url || current.src);
      return;
    }
    setPlaying(audioEl.paused);
  });

  if (miniPlayBtn) {
    miniPlayBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!audioEl) return;
      var current = ensureCurrentTrackInfo();
      if (!audioEl.src) {
        if (!current) {
          showToast("暂无歌曲");
          return;
        }
        if (current && current.id) {
          playSongById(current.id, current);
          return;
        }
        state.playCtx = { key: trackKey(current), triedApi: true, triedOuter: true };
        playUrl(current.url || current.src);
        return;
      }
      setPlaying(audioEl.paused);
    });
  }

  if (miniOpen) {
    miniOpen.addEventListener("click", function () {
      openPlayer();
      setActiveTab("play");
      scheduleWaveRebuild();
    });
  }

  modeBtn.addEventListener("click", function () {
    setModeByIndex(state.modeIndex + 1);
  });

  prevBtn.addEventListener("click", function () {
    playQueueIndex(computeNextIndex(-1));
  });

  nextBtn.addEventListener("click", function () {
    playQueueIndex(computeNextIndex(1));
  });

  closeBtn.onclick = function () {
    closePlayer();
    try {
      if (window.parent && window.parent !== window && typeof window.parent.closeApp === "function") {
        window.parent.closeApp();
      }
    } catch (e) {}
  };

  if (audioEl) {
    audioEl.addEventListener("play", function () {
      state.isPlaying = true;
      playerSheet.classList.add("is-playing");
      setPlayIcon(true);
    });

    audioEl.addEventListener("pause", function () {
      state.isPlaying = false;
      playerSheet.classList.remove("is-playing");
      setPlayIcon(false);
    });

    audioEl.addEventListener("timeupdate", function () {
      updateWaveFromAudio();
    });

    audioEl.addEventListener("loadedmetadata", function () {
      updateWaveFromAudio();
    });

    audioEl.addEventListener("ended", function () {
      handleTrackEnd();
    });

    audioEl.addEventListener("error", function () {
      var current = state.queue[state.currentIndex];
      if (!current) {
        showToast("音频加载失败");
        return;
      }

      var ctx = state.playCtx;
      var key = trackKey(current);
      if (!ctx || ctx.key !== key) {
        ctx = { key: key, triedApi: true, triedOuter: false };
        state.playCtx = ctx;
      }

      if (current.id && !ctx.triedOuter) {
        ctx.triedOuter = true;
        showToast("音源切换中...");
        playUrl(NETEASE_OUTER_URL + encodeURIComponent(String(current.id)) + ".mp3");
        return;
      }

      showToast("该歌曲无法播放");
      disableSong(current);
      playNextAfterDisable(state.currentIndex);
    });
  }

  ensureLatestServiceWorker();
  state.library = loadLibrary();
  rebuildQueue();
  setSearchActive(false);
  setClearVisible(false);
  setModeByIndex(0);
  scheduleWaveRebuild();
  setPlayIcon(false);
  renderHomePlaylist();

  window.addEventListener("resize", function () {
    scheduleWaveRebuild();
  });
})();
