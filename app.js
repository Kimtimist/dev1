// ===== 1. 엑셀 기반 데이터 불러오기 & 변환 =====

// data.js에서 넘어온 flat row
const rows = Array.isArray(window.VINYL_ROWS) ? window.VINYL_ROWS : [];

// rows → artists / albums / tracks 구조로 변환
function buildDataFromRows(rows) {
  const artistSet = new Set();
  const albumsMap = new Map();
  const tracks = [];

  rows.forEach((r) => {
    const artist = (r.Artist || "").trim();
    const album = (r.Album || "").trim();
    const year = r.Year || null;
    const country = r.Country || "";
    const genre = r.Genre || "";
    const location = r.Location || "";
    const trackNo = r.Track_no || "";
    const title = r.Track_title || "";
    const albumNo = r.Album_No || null;

    // "#chill #citypop" → ["chill", "citypop"]
    const tags = (r.Mood_tags || "")
      .split(/\s+/)
      .map((t) => t.replace(/^#/, "").trim())
      .filter(Boolean);

    if (artist) artistSet.add(artist);

    if (artist && album) {
      const key = `${artist}__${album}`;
      if (!albumsMap.has(key)) {
        albumsMap.set(key, {
          artist,
          title: album,
          year,
          country,
          genre,
          tags,
          location,
          albumNo
        });
      }
    }

    if (artist && album && title) {
      tracks.push({
        artist,
        album,
        title,
        genre,
        tags,
        trackNo,
        note: "",
        location
      });
    }
  });

  return {
    artists: Array.from(artistSet).map((name) => ({ name })),
    albums: Array.from(albumsMap.values()),
    tracks
  };
}

const data = buildDataFromRows(rows);

// ===== 2. 한글/영문 이니셜 처리 =====
const hangulBuckets = ["가","나","다","라","마","바","사","아","자","차","카","타","파","하"];

function getHangulBucket(ch) {
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return "#";
  const base = code - 0xac00;
  const initialIndex = Math.floor(base / (21 * 28)); // 0~18

  if (initialIndex === 0 || initialIndex === 1) return "가";
  if (initialIndex === 2) return "나";
  if (initialIndex === 3 || initialIndex === 4) return "다";
  if (initialIndex === 5) return "라";
  if (initialIndex === 6) return "마";
  if (initialIndex === 7 || initialIndex === 8) return "바";
  if (initialIndex === 9 || initialIndex === 10) return "사";
  if (initialIndex === 11) return "아";
  if (initialIndex === 12 || initialIndex === 13) return "자";
  if (initialIndex === 14) return "차";
  if (initialIndex === 15) return "카";
  if (initialIndex === 16) return "타";
  if (initialIndex === 17) return "파";
  if (initialIndex === 18) return "하";
  return "#";
}

function getArtistInitial(name) {
  const first = (name || "").trim()[0];
  if (!first) return "#";
  const code = first.charCodeAt(0);

  if ((first >= "A" && first <= "Z") || (first >= "a" && first <= "z")) {
    return first.toUpperCase();
  }
  if (code >= 0xac00 && code <= 0xd7a3) {
    return getHangulBucket(first);
  }
  return "#";
}

// 영문 우선 정렬용
function isLatinName(name) {
  const first = (name || "").trim()[0] || "";
  return /[A-Za-z]/.test(first);
}

const artistsWithInitial = data.artists.map((a) => ({
  ...a,
  initial: getArtistInitial(a.name)
}));

// ===== 3. DOM 참조 & 상태 =====
const explorerCard = document.getElementById("explorerCard");
const artistView = document.getElementById("artistView");
const albumView = document.getElementById("albumView");
const trackView = document.getElementById("trackView");

const latinRow = document.getElementById("latinRow");
const hangulRow = document.getElementById("hangulRow");
const artistListEl = document.getElementById("artistList");
const artistPrevBtn = document.getElementById("artistPrev");
const artistNextBtn = document.getElementById("artistNext");
const artistPagesEl = document.getElementById("artistPages");

const albumArtistTitle = document.getElementById("albumArtistTitle");
const albumListPageEl = document.getElementById("albumListPage");

const trackAlbumTitle = document.getElementById("trackAlbumTitle");
const trackListPageEl = document.getElementById("trackListPage");

const backToArtistsBtn = document.getElementById("backToArtists");
const backToAlbumsBtn = document.getElementById("backToAlbums");

const searchCard = document.getElementById("searchCard");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resultsEl = document.getElementById("results");
const searchInfoEl = document.getElementById("searchInfo");
const searchPaginationEl = document.getElementById("searchPagination");
const homeButton = document.getElementById("homeButton");

// modal
const modalEl = document.getElementById("trackModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const mArtist = document.getElementById("mArtist");
const mAlbum = document.getElementById("mAlbum");
const mGenre = document.getElementById("mGenre");
const mLocation = document.getElementById("mLocation");
const mTrackNo = document.getElementById("mTrackNo");
const mTitle = document.getElementById("mTitle");
const mNote = document.getElementById("mNote");
const mTags = document.getElementById("mTags");

const latinLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

let activeInitial = "";
let currentPage = 1;
const PAGE_SIZE = 15;

let selectedArtistName = null;
let selectedAlbumKey = null; // `${artist}__${album}`
let currentView = "artists"; // 'artists' | 'albums' | 'tracks' | 'search'

// 검색 결과 상태 (페이지네이션용)
let currentSearchResults = [];
let currentSearchPage = 1;
const SEARCH_PAGE_SIZE = 30;

// ===== 4. 기본 뷰 제어 =====
function setView(view) {
  currentView = view;

  if (view === "search") {
    explorerCard.style.display = "none";
    searchCard.style.display = "block";
  } else {
    explorerCard.style.display = "block";
    searchCard.style.display = "none";
  }

  artistView.style.display = view === "artists" ? "block" : "none";
  albumView.style.display = view === "albums" ? "block" : "none";
  trackView.style.display = view === "tracks" ? "block" : "none";
}

function openTrackModal(info) {
  mArtist.textContent = info.artist || "";
  mAlbum.textContent = info.album || "";
  mGenre.textContent = info.genre || "";
  mLocation.textContent = info.location || "";
  mTrackNo.textContent = info.trackNo || "";
  mTitle.textContent = info.title || "";
  mNote.textContent = info.note || "";
  mTags.innerHTML = "";
  (info.tags || []).forEach((tag) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = "#" + tag;
    mTags.appendChild(span);
  });
  modalEl.classList.add("show");
}

function closeTrackModal() {
  modalEl.classList.remove("show");
}

modalCloseBtn.addEventListener("click", closeTrackModal);
modalEl.addEventListener("click", (e) => {
  if (e.target === modalEl) closeTrackModal();
});

// ===== 5. 라우팅 헬퍼 (hash 기반 내비게이션) =====
function navigateToArtists() {
  location.hash = "#artists";
}

function navigateToAlbums(artist) {
  const encodedArtist = encodeURIComponent(artist);
  location.hash = `#albums/${encodedArtist}`;
}

function navigateToTracks(artist, album) {
  const encodedArtist = encodeURIComponent(artist);
  const encodedAlbum = encodeURIComponent(album);
  location.hash = `#tracks/${encodedArtist}/${encodedAlbum}`;
}

function navigateToSearch(query) {
  const q = (query || "").trim();
  if (!q) {
    navigateToArtists();
    return;
  }
  const encoded = encodeURIComponent(q);
  location.hash = `#search/${encoded}`;
}

// ===== 6. A~Z / 가~하 버튼 & Artist 리스트 =====
function renderInitialButtons() {
  latinRow.innerHTML = "";
  latinLetters.forEach((ch) => {
    const btn = document.createElement("button");
    btn.textContent = ch;
    btn.className = "az-button" + (activeInitial === ch ? " active" : "");
    btn.addEventListener("click", () => {
      activeInitial = activeInitial === ch ? "" : ch;
      currentPage = 1;
      renderInitialButtons();
      renderArtistList();
    });
    latinRow.appendChild(btn);
  });

  hangulRow.innerHTML = "";
  hangulBuckets.forEach((ch) => {
    const btn = document.createElement("button");
    btn.textContent = ch;
    btn.className = "az-button" + (activeInitial === ch ? " active" : "");
    btn.addEventListener("click", () => {
      activeInitial = activeInitial === ch ? "" : ch;
      currentPage = 1;
      renderInitialButtons();
      renderArtistList();
    });
    hangulRow.appendChild(btn);
  });
}

function renderArtistList() {
  artistListEl.innerHTML = "";
  const listAll = artistsWithInitial
    .filter((a) => (activeInitial ? a.initial === activeInitial : true))
    .sort((a, b) => {
      const aLatin = isLatinName(a.name);
      const bLatin = isLatinName(b.name);
      if (aLatin && !bLatin) return -1;
      if (!aLatin && bLatin) return 1;
      return a.name.localeCompare(b.name, "ko");
    });

  const total = listAll.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageList = listAll.slice(start, start + PAGE_SIZE);

  if (pageList.length === 0) {
    const empty = document.createElement("div");
    empty.textContent = "해당 이니셜의 아티스트가 없습니다.";
    empty.style.fontSize = "12px";
    empty.style.color = "#9ca3af";
    artistListEl.appendChild(empty);
  } else {
    const albumCountByArtist = {};
    data.albums.forEach((al) => {
      albumCountByArtist[al.artist] = (albumCountByArtist[al.artist] || 0) + 1;
    });

    pageList.forEach((a) => {
      const row = document.createElement("div");
      row.className =
        "artist-item" + (selectedArtistName === a.name ? " selected" : "");
      const left = document.createElement("div");
      left.className = "artist-name";
      left.textContent = a.name;
      const right = document.createElement("div");
      right.className = "artist-meta";
      right.textContent = (albumCountByArtist[a.name] || 0) + " albums";
      row.appendChild(left);
      row.appendChild(right);

      row.addEventListener("click", () => {
        navigateToAlbums(a.name);
      });

      artistListEl.appendChild(row);
    });
  }

  // 페이지 버튼
  artistPagesEl.innerHTML = "";
  for (let p = 1; p <= totalPages; p++) {
    const btn = document.createElement("button");
    btn.textContent = p;
    btn.className = "page-num" + (p === currentPage ? " active" : "");
    btn.addEventListener("click", () => {
      currentPage = p;
      renderArtistList();
    });
    artistPagesEl.appendChild(btn);
  }

  artistPrevBtn.disabled = currentPage <= 1;
  artistNextBtn.disabled = currentPage >= totalPages;
}

artistPrevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderArtistList();
  }
});

artistNextBtn.addEventListener("click", () => {
  const listAll = artistsWithInitial.filter((a) =>
    activeInitial ? a.initial === activeInitial : true
  );
  const totalPages = Math.max(1, Math.ceil(listAll.length / PAGE_SIZE));
  if (currentPage < totalPages) {
    currentPage++;
    renderArtistList();
  }
});

// ===== 7. Album / Track 페이지 렌더 =====
function renderAlbumPage() {
  albumListPageEl.innerHTML = "";
  if (!selectedArtistName) {
    albumArtistTitle.textContent = "Artist";
    albumListPageEl.innerHTML =
      '<div style="font-size:12px;color:#6b7280;">아티스트를 먼저 선택하세요.</div>';
    return;
  }

  albumArtistTitle.textContent = selectedArtistName;
  const albums = data.albums.filter((al) => al.artist === selectedArtistName);
  if (albums.length === 0) {
    albumListPageEl.innerHTML =
      '<div style="font-size:12px;color:#6b7280;">등록된 앨범이 없습니다.</div>';
    return;
  }

  albums.forEach((al) => {
    const key = `${al.artist}__${al.title}`;
    const item = document.createElement("div");
    item.className =
      "album-item" + (selectedAlbumKey === key ? " selected" : "");
    const main = document.createElement("div");
    main.className = "album-main";
    main.textContent = al.title;
    const sub = document.createElement("div");
    sub.className = "album-sub";
    sub.textContent = `${al.artist} · ${al.year || ""} · ${al.genre || ""}`;
    item.appendChild(main);
    item.appendChild(sub);

    item.addEventListener("click", () => {
      navigateToTracks(al.artist, al.title);
    });

    albumListPageEl.appendChild(item);
  });
}

function renderTrackPage() {
  trackListPageEl.innerHTML = "";
  if (!selectedAlbumKey) {
    trackAlbumTitle.textContent = "Album";
    trackListPageEl.innerHTML =
      '<div style="font-size:12px;color:#6b7280;">앨범을 먼저 선택하세요.</div>';
    return;
  }

  const [artistName, albumTitle] = selectedAlbumKey.split("__");
  const albumInfo = data.albums.find(
    (al) => al.artist === artistName && al.title === albumTitle
  );
  trackAlbumTitle.textContent = `${artistName} – ${albumTitle}`;

  const tracks = data.tracks.filter(
    (t) => t.artist === artistName && t.album === albumTitle
  );

  if (tracks.length === 0) {
    trackListPageEl.innerHTML =
      '<div style="font-size:12px;color:#6b7280;">등록된 트랙이 없습니다.</div>';
    return;
  }

  tracks.forEach((t) => {
    const item = document.createElement("div");
    item.className = "track-item";
    const main = document.createElement("div");
    main.className = "track-main";
    main.textContent = t.title;
    const sub = document.createElement("div");
    sub.className = "track-sub";
    sub.textContent = `${t.artist} – ${t.album} · ${t.genre || ""}`;
    item.appendChild(main);
    item.appendChild(sub);

    const info = {
      artist: t.artist,
      album: t.album,
      genre: t.genre,
      tags: t.tags,
      location: albumInfo ? albumInfo.location : "",
      trackNo: t.trackNo,
      title: t.title,
      note: t.note || ""
    };
    item.addEventListener("click", () => openTrackModal(info));

    trackListPageEl.appendChild(item);
  });
}

// 백 버튼들
backToArtistsBtn.addEventListener("click", () => {
  navigateToArtists();
});

backToAlbumsBtn.addEventListener("click", () => {
  if (selectedArtistName) {
    navigateToAlbums(selectedArtistName);
  } else {
    navigateToArtists();
  }
});

// ===== 8. 검색 =====
function getActiveFilters() {
  const filters = { artist: false, album: false, genre: false, tag: false, song: false };
  document.querySelectorAll("[data-filter]").forEach((input) => {
    filters[input.getAttribute("data-filter")] = input.checked;
    const label = input.closest(".filter-chip");
    if (input.checked) label.classList.add("filter-chip-active");
    else label.classList.remove("filter-chip-active");
  });
  // 모두 꺼지면 전체 다시 켜기
  if (!filters.artist && !filters.album && !filters.genre && !filters.tag && !filters.song) {
    Object.keys(filters).forEach((k) => (filters[k] = true));
    document.querySelectorAll("[data-filter]").forEach((input) => {
      input.checked = true;
      const label = input.closest(".filter-chip");
      label.classList.add("filter-chip-active");
    });
  }
  return filters;
}

// 검색 결과 한 페이지 렌더
function renderSearchResultsPage() {
  resultsEl.innerHTML = "";

  const total = currentSearchResults.length;
  if (total === 0) {
    if (searchInput.value.trim()) {
      const q = searchInput.value.trim();
      searchInfoEl.textContent = `"${q}"에 해당하는 결과가 없습니다.`;
    } else {
      searchInfoEl.textContent = "검색어를 입력하거나 필터를 조정해보세요.";
    }
    if (searchPaginationEl) searchPaginationEl.innerHTML = "";
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));
  if (currentSearchPage > totalPages) currentSearchPage = totalPages;

  const start = (currentSearchPage - 1) * SEARCH_PAGE_SIZE;
  const pageList = currentSearchResults.slice(start, start + SEARCH_PAGE_SIZE);

  pageList.forEach((r) => {
    const item = document.createElement("div");
    item.className = "result-item";

    const typeEl = document.createElement("div");
    typeEl.className = "result-type";
    typeEl.textContent = r.type;

    if (r.type === "Artist") {
      typeEl.classList.add("result-type-artist");
    } else if (r.type === "Album") {
      typeEl.classList.add("result-type-album");
    } else if (r.type === "Song") {
      typeEl.classList.add("result-type-song");
    }

    const mainEl = document.createElement("div");
    mainEl.className = "result-main";
    mainEl.textContent = r.main;

    const subEl = document.createElement("div");
    subEl.className = "result-sub";
    subEl.textContent = r.sub;

    item.appendChild(typeEl);
    item.appendChild(mainEl);
    item.appendChild(subEl);

    if (r.tags && r.tags.length) {
      const tagWrap = document.createElement("div");
      r.tags.forEach((tag) => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = "#" + tag;
        tagWrap.appendChild(span);
      });
      item.appendChild(tagWrap);
    }

    // 클릭 동작
    item.addEventListener("click", () => {
      if (r.type === "Artist") {
        navigateToAlbums(r.main);
      } else if (r.type === "Album") {
        navigateToTracks(r.artist, r.album);
      } else if (r.type === "Song") {
        const albumInfo = data.albums.find(
          (al) => al.artist === r.artist && al.title === r.album
        );
        const track = data.tracks.find(
          (t) =>
            t.artist === r.artist &&
            t.album === r.album &&
            t.title === r.main
        );
        if (track) {
          const info = {
            artist: track.artist,
            album: track.album,
            genre: track.genre,
            tags: track.tags,
            location: albumInfo ? albumInfo.location : "",
            trackNo: track.trackNo,
            title: track.title,
            note: track.note || ""
          };
          openTrackModal(info);
        }
      }
    });

    resultsEl.appendChild(item);
  });

  // 페이지네이션 렌더
  if (!searchPaginationEl) return;
  searchPaginationEl.innerHTML = "";

  if (total <= SEARCH_PAGE_SIZE) {
    return; // 한 페이지면 페이지 버튼 안 보여줌
  }

  const totalPagesText = Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE));

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Prev";
  prevBtn.className = "search-page-btn";
  prevBtn.disabled = currentSearchPage <= 1;
  prevBtn.addEventListener("click", () => {
    if (currentSearchPage > 1) {
      currentSearchPage--;
      renderSearchResultsPage();
    }
  });
  searchPaginationEl.appendChild(prevBtn);

  for (let p = 1; p <= totalPagesText; p++) {
    const btn = document.createElement("button");
    btn.textContent = p;
    btn.className =
      "search-page-num" + (p === currentSearchPage ? " active" : "");
    btn.addEventListener("click", () => {
      currentSearchPage = p;
      renderSearchResultsPage();
    });
    searchPaginationEl.appendChild(btn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next";
  nextBtn.className = "search-page-btn";
  nextBtn.disabled = currentSearchPage >= totalPagesText;
  nextBtn.addEventListener("click", () => {
    if (currentSearchPage < totalPagesText) {
      currentSearchPage++;
      renderSearchResultsPage();
    }
  });
  searchPaginationEl.appendChild(nextBtn);
}

// 검색 실행 (해시는 건드리지 않음)
function runSearch(rawQuery) {
  const qStr = typeof rawQuery === "string" ? rawQuery : searchInput.value;
  const q = qStr.trim().toLowerCase();
  const displayQ = qStr.trim();
  const filters = getActiveFilters();

  resultsEl.innerHTML = "";
  currentSearchResults = [];
  currentSearchPage = 1;
  if (searchPaginationEl) searchPaginationEl.innerHTML = "";

  if (!q) {
    searchInfoEl.textContent = "검색어를 입력하거나 필터를 조정해보세요.";
    return;
  }

  const results = [];

  // Artist 검색
  if (filters.artist) {
    artistsWithInitial.forEach((a) => {
      if (a.name.toLowerCase().includes(q)) {
        results.push({
          type: "Artist",
          main: a.name,
          sub: "이 아티스트의 앨범과 곡을 탐색하세요.",
          tags: []
        });
      }
    });
  }

  // Album 검색
  if (filters.album || filters.genre || filters.tag || filters.artist) {
    data.albums.forEach((al) => {
      const hayAlbum = al.title.toLowerCase();
      const hayArtist = al.artist.toLowerCase();
      const hayGenre = (al.genre || "").toLowerCase();
      const hayTags = (al.tags || []).map((t) => t.toLowerCase());
      let hit = false;

      if (filters.album && hayAlbum.includes(q)) hit = true;
      if (filters.artist && hayArtist.includes(q)) hit = true;
      if (filters.genre && hayGenre.includes(q)) hit = true;
      if (filters.tag && hayTags.some((t) => t.includes(q.replace(/^#/, "")))) hit = true;

      if (hit) {
        results.push({
          type: "Album",
          main: `${al.artist} – ${al.title}`,
          sub: `${al.year || ""} · ${al.genre || ""} · ${al.country || ""}`,
          tags: al.tags || [],
          artist: al.artist,
          album: al.title
        });
      }
    });
  }

  // Song 검색
  if (filters.song || filters.artist || filters.album || filters.genre || filters.tag) {
    data.tracks.forEach((t) => {
      const haySong = t.title.toLowerCase();
      const hayArtist = t.artist.toLowerCase();
      const hayAlbum = t.album.toLowerCase();
      const hayGenre = (t.genre || "").toLowerCase();
      const hayTags = (t.tags || []).map((x) => x.toLowerCase());
      let hit = false;

      if (filters.song && haySong.includes(q)) hit = true;
      if (filters.artist && hayArtist.includes(q)) hit = true;
      if (filters.album && hayAlbum.includes(q)) hit = true;
      if (filters.genre && hayGenre.includes(q)) hit = true;
      if (filters.tag && hayTags.some((tag) => tag.includes(q.replace(/^#/, "")))) hit = true;

      if (hit) {
        results.push({
          type: "Song",
          main: t.title,
          sub: `${t.artist} – ${t.album} · ${t.genre || ""}`,
          tags: t.tags || [],
          artist: t.artist,
          album: t.album
        });
      }
    });
  }

  if (results.length === 0) {
    currentSearchResults = [];
    searchInfoEl.textContent = `"${displayQ}"에 해당하는 결과가 없습니다.`;
    return;
  } else {
    searchInfoEl.textContent = `"${displayQ}" 검색 결과: ${results.length}개`;
  }

  currentSearchResults = results;
  currentSearchPage = 1;
  renderSearchResultsPage();
}

// 검색 버튼 / 엔터 → 해시 변경 (라우터가 runSearch 호출)
searchButton.addEventListener("click", () => {
  const q = searchInput.value.trim();
  navigateToSearch(q);
});

searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const q = searchInput.value.trim();
    navigateToSearch(q);
  }
});

// 검색창에서 텍스트 지우면 → artists로 복귀
searchInput.addEventListener("input", () => {
  if (!searchInput.value.trim() && currentView === "search") {
    navigateToArtists();
  }
});

// 필터 변경 시, 검색 화면이면 재검색
document.querySelectorAll("[data-filter]").forEach((input) => {
  input.addEventListener("change", () => {
    getActiveFilters();
    if (currentView === "search" && searchInput.value.trim()) {
      runSearch(searchInput.value);
    }
  });
});

// ===== 9. Home 버튼 (완전 초기화) =====
homeButton.addEventListener("click", () => {
  // 1) 검색창 리셋
  searchInput.value = "";
  currentSearchResults = [];
  currentSearchPage = 1;
  resultsEl.innerHTML = "";
  searchInfoEl.textContent = "검색어를 입력하거나 필터를 조정해보세요.";
  if (searchPaginationEl) searchPaginationEl.innerHTML = "";

  // 2) 검색 필터 전부 ON
  document.querySelectorAll("[data-filter]").forEach((input) => {
    input.checked = true;
    const label = input.closest(".filter-chip");
    if (label) label.classList.add("filter-chip-active");
  });

  // 3) A~Z / 가~하, 페이지, 선택 상태 초기화
  activeInitial = "";
  currentPage = 1;
  selectedArtistName = null;
  selectedAlbumKey = null;

  // 4) 아티스트 목록/버튼 다시 렌더
  renderInitialButtons();
  renderArtistList();

  // 5) 라우트도 초기 상태
  location.hash = "#artists";
});

// ===== 10. 모바일 스와이프 → history.back() =====
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;

function handleTouchStart(e) {
  if (!e.touches || e.touches.length === 0) return;
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchEndX = t.clientX;
  touchEndY = t.clientY;
}

function handleTouchMove(e) {
  if (!e.touches || e.touches.length === 0) return;
  const t = e.touches[0];
  touchEndX = t.clientX;
  touchEndY = t.clientY;
}

function handleTouchEnd() {
  const dx = touchEndX - touchStartX;
  const dy = touchEndY - touchStartY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // 가로로 오른쪽으로 일정 이상 스와이프했을 때만 인식
  if (absDx > 50 && absDx > absDy && dx > 0) {
    handleSwipeRight();
  }
}

function handleSwipeRight() {
  // 모달 떠 있으면 먼저 모달 닫기
  if (modalEl.classList.contains("show")) {
    closeTrackModal();
    return;
  }

  // 해시 히스토리가 루트 이상 있을 때만 뒤로가기
  if (location.hash && location.hash !== "#artists") {
    history.back();
  }
}

// 스와이프 이벤트는 페이지 전체에 붙임
const pageEl = document.querySelector(".page") || document.body;
pageEl.addEventListener("touchstart", handleTouchStart, { passive: true });
pageEl.addEventListener("touchmove", handleTouchMove, { passive: true });
pageEl.addEventListener("touchend", handleTouchEnd);

// ===== 11. hash 기반 라우터 =====
function applyRouteFromHash() {
  let hash = location.hash || "";
  if (!hash || hash === "#") {
    // 기본: artists
    setView("artists");
    selectedArtistName = null;
    selectedAlbumKey = null;
    searchInput.value = "";
    resultsEl.innerHTML = "";
    searchInfoEl.textContent = "검색어를 입력하거나 필터를 조정해보세요.";
    if (searchPaginationEl) searchPaginationEl.innerHTML = "";
    return;
  }

  hash = hash.replace(/^#/, "");
  const parts = hash.split("/");
  const route = parts[0];

  if (route === "artists") {
    setView("artists");
    selectedArtistName = null;
    selectedAlbumKey = null;
    // 검색 관련만 리셋
    searchInput.value = "";
    resultsEl.innerHTML = "";
    searchInfoEl.textContent = "검색어를 입력하거나 필터를 조정해보세요.";
    if (searchPaginationEl) searchPaginationEl.innerHTML = "";
  } else if (route === "albums") {
    const artist = decodeURIComponent(parts[1] || "");
    selectedArtistName = artist || null;
    selectedAlbumKey = null;
    setView("albums");
    renderAlbumPage();
  } else if (route === "tracks") {
    const artist = decodeURIComponent(parts[1] || "");
    const album = decodeURIComponent(parts[2] || "");
    selectedArtistName = artist || null;
    selectedAlbumKey = artist && album ? `${artist}__${album}` : null;
    setView("tracks");
    renderTrackPage();
  } else if (route === "search") {
    const qEncoded = parts.slice(1).join("/");
    const q = decodeURIComponent(qEncoded || "");
    searchInput.value = q;
    setView("search");
    runSearch(q);
  } else {
    // 알 수 없는 해시면 artists로 복귀
    navigateToArtists();
  }
}

window.addEventListener("hashchange", applyRouteFromHash);

// ===== 12. 초기 렌더 =====
renderInitialButtons();
renderArtistList();

// 첫 로딩 시 해시 없으면 #artists로 설정
if (!location.hash) {
  location.hash = "#artists";
} else {
  applyRouteFromHash();
}
