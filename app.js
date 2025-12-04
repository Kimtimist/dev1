// ===== 샘플 데이터 =====
const artistNames = [
  "AC/DC",
  "Adele",
  "Arctic Monkeys",
  "Bruno Mars",
  "Daft Punk",
  "Earth, Wind & Fire",
  "Fleetwood Mac",
  "Jamiroquai",
  "John Coltrane",
  "King Crimson",
  "김광석",
  "김현철",
  "나얼",
  "뉴진스",
  "박재범",
  "아이유",
  "유재하",
  "이문세",
  "山下達郎",
  "大貫妙子"
];

const data = {
  artists: artistNames.map((name) => ({ name })),
  albums: [
    {
      artist: "AC/DC",
      title: "Back In Black",
      year: 1980,
      country: "AU",
      genre: "Rock",
      tags: ["classic", "energy"],
      location: "Shelf A-1"
    },
    {
      artist: "Daft Punk",
      title: "Discovery",
      year: 2001,
      country: "FR",
      genre: "House/Disco",
      tags: ["french", "disco"],
      location: "Shelf B-2"
    },
    {
      artist: "김광석",
      title: "김광석 4집",
      year: 1994,
      country: "KR",
      genre: "Folk",
      tags: ["night", "ballad"],
      location: "Shelf C-1"
    },
    {
      artist: "유재하",
      title: "사랑하기 때문에",
      year: 1987,
      country: "KR",
      genre: "City Pop",
      tags: ["citypop", "soft"],
      location: "Shelf C-2"
    },
    {
      artist: "山下達郎",
      title: "FOR YOU",
      year: 1982,
      country: "JP",
      genre: "City Pop",
      tags: ["japanese", "morning"],
      location: "Shelf D-1"
    }
  ],
  tracks: [
    {
      artist: "AC/DC",
      album: "Back In Black",
      title: "Back In Black",
      genre: "Rock",
      tags: ["classic", "energy"],
      trackNo: "A1",
      note: ""
    },
    {
      artist: "AC/DC",
      album: "Back In Black",
      title: "Hells Bells",
      genre: "Rock",
      tags: ["energy"],
      trackNo: "A2",
      note: "Great opener"
    },
    {
      artist: "Daft Punk",
      album: "Discovery",
      title: "One More Time",
      genre: "House/Disco",
      tags: ["disco"],
      trackNo: "A1",
      note: ""
    },
    {
      artist: "Daft Punk",
      album: "Discovery",
      title: "Aerodynamic",
      genre: "House/Disco",
      tags: ["instrumental", "disco"],
      trackNo: "A2",
      note: ""
    },
    {
      artist: "김광석",
      album: "김광석 4집",
      title: "두 바퀴로 가는 자동차",
      genre: "Folk",
      tags: ["night"],
      trackNo: "B2",
      note: ""
    },
    {
      artist: "유재하",
      album: "사랑하기 때문에",
      title: "지난 날",
      genre: "City Pop",
      tags: ["citypop"],
      trackNo: "A1",
      note: ""
    },
    {
      artist: "山下達郎",
      album: "FOR YOU",
      title: "Sparkle",
      genre: "City Pop",
      tags: ["japanese", "morning"],
      trackNo: "A1",
      note: ""
    }
  ]
};

// ===== 상태 관리 =====
const state = {
  view: "artists",        // 'artists' | 'albums' | 'tracks' | 'search'
  selectedArtist: null,
  selectedAlbumKey: null, // `${artist}__${album}`
  searchQuery: ""
};

const hangulBuckets = ["가","나","다","라","마","바","사","아","자","차","카","타","파","하"];
const latinLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PAGE_SIZE = 15;

let activeInitial = "";
let currentPage = 1;

// ===== 한글 이니셜 매핑 =====
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

function isLatinName(name) {
  const first = (name || "").trim()[0] || "";
  return /[A-Za-z]/.test(first);
}
function getArtistInitial(name) {
  const first = name.trim()[0];
  const code = first.charCodeAt(0);
  if ((first >= "A" && first <= "Z") || (first >= "a" && first <= "z")) {
    return first.toUpperCase();
  }
  if (code >= 0xac00 && code <= 0xd7a3) {
    return getHangulBucket(first);
  }
  return "#";
}

const artistsWithInitial = data.artists.map((a) => ({
  ...a,
  initial: getArtistInitial(a.name)
}));

// ===== DOM =====
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

// ===== view helper =====
function setView(view) {
  state.view = view;
  artistView.style.display = view === "artists" ? "block" : "none";
  albumView.style.display = view === "albums" ? "block" : "none";
  trackView.style.display = view === "tracks" ? "block" : "none";
}

function showExplorer() {
  explorerCard.style.display = "block";
  searchCard.style.display = "none";
}

function showSearchCard() {
  explorerCard.style.display = "none";
  searchCard.style.display = "block";
}

// ===== 모달 =====
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

// ===== 렌더링: 이니셜 버튼 =====
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

// ===== 렌더링: Artist 리스트 =====
function renderArtistList() {
  artistListEl.innerHTML = "";
  const listAll = artistsWithInitial
  .filter((a) => (activeInitial ? a.initial === activeInitial : true))
  .sort((a, b) => {
    const aLatin = isLatinName(a.name);
    const bLatin = isLatinName(b.name);

    // 영문 아티스트를 먼저 배치
    if (aLatin && !bLatin) return -1;
    if (!aLatin && bLatin) return 1;

    // 같은 그룹(둘 다 영문 or 둘 다 한글) 안에서는 이름순 정렬
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
        "artist-item" + (state.selectedArtist === a.name ? " selected" : "");
      const left = document.createElement("div");
      left.className = "artist-name";
      left.textContent = a.name;
      const right = document.createElement("div");
      right.className = "artist-meta";
      right.textContent = (albumCountByArtist[a.name] || 0) + " albums";
      row.appendChild(left);
      row.appendChild(right);

      row.addEventListener("click", () => {
        state.selectedArtist = a.name;
        state.selectedAlbumKey = null;
        showExplorer();
        setView("albums");
        renderAlbumPage();
        history.pushState(
          { view: "albums", artist: state.selectedArtist },
          "",
          ""
        );
      });

      artistListEl.appendChild(row);
    });
  }

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

// ===== 렌더링: Album 페이지 =====
function renderAlbumPage() {
  albumListPageEl.innerHTML = "";
  if (!state.selectedArtist) {
    albumArtistTitle.textContent = "Artist";
    albumListPageEl.innerHTML =
      '<div style="font-size:12px;color:#6b7280;">아티스트를 먼저 선택하세요.</div>';
    return;
  }

  albumArtistTitle.textContent = state.selectedArtist;
  const albums = data.albums.filter((al) => al.artist === state.selectedArtist);
  if (albums.length === 0) {
    albumListPageEl.innerHTML =
      '<div style="font-size:12px;color:#6b7280;">등록된 앨범이 없습니다.</div>';
    return;
  }

  albums.forEach((al) => {
    const key = `${al.artist}__${al.title}`;
    const item = document.createElement("div");
    item.className =
      "album-item" + (state.selectedAlbumKey === key ? " selected" : "");
    const main = document.createElement("div");
    main.className = "album-main";
    main.textContent = al.title;
    const sub = document.createElement("div");
    sub.className = "album-sub";
    sub.textContent = `${al.artist} · ${al.year || ""} · ${al.genre || ""}`;
    item.appendChild(main);
    item.appendChild(sub);

    item.addEventListener("click", () => {
      state.selectedAlbumKey = key;
      showExplorer();
      setView("tracks");
      renderTrackPage();
      history.pushState(
        { view: "tracks", artist: state.selectedArtist, albumKey: state.selectedAlbumKey },
        "",
        ""
      );
    });

    albumListPageEl.appendChild(item);
  });
}

// ===== 렌더링: Track 페이지 =====
function renderTrackPage() {
  trackListPageEl.innerHTML = "";
  if (!state.selectedAlbumKey) {
    trackAlbumTitle.textContent = "Album";
    trackListPageEl.innerHTML =
      '<div style="font-size:12px;color:#6b7280;">앨범을 먼저 선택하세요.</div>';
    return;
  }

  const [artistName, albumTitle] = state.selectedAlbumKey.split("__");
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

// ===== 검색 =====
function getActiveFilters() {
  const filters = { artist: false, album: false, genre: false, tag: false, song: false };
  document.querySelectorAll("[data-filter]").forEach((input) => {
    filters[input.getAttribute("data-filter")] = input.checked;
    const label = input.closest(".filter-chip");
    if (input.checked) label.classList.add("filter-chip-active");
    else label.classList.remove("filter-chip-active");
  });
  if (!filters.artist && !filters.album && !filters.genre && !filters.tag && !filters.song) {
    Object.keys(filters).forEach((k) => (filters[k] = true));
  }
  return filters;
}

// fromState=true면 history.pushState 하지 않음
function runSearch(fromState = false) {
  const qRaw = searchInput.value.trim();
  const q = qRaw.toLowerCase();
  const filters = getActiveFilters();
  resultsEl.innerHTML = "";

  if (!q) {
    searchInfoEl.textContent = "검색어를 입력하거나 필터를 조정해보세요.";
    if (!fromState) {
      goHome(false);
    }
    return;
  }

  state.view = "search";
  state.searchQuery = qRaw;
  showSearchCard();

  const results = [];

  // Artist
  if (filters.artist) {
    artistsWithInitial.forEach((a) => {
      if (a.name.toLowerCase().includes(q)) {
        results.push({
          type: "Artist",
          artistName: a.name,
          displayMain: a.name,
          displaySub: "이 아티스트의 앨범과 곡을 탐색하세요.",
          tags: []
        });
      }
    });
  }

  // Album
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
          albumRef: al,
          displayMain: `${al.artist} – ${al.title}`,
          displaySub: `${al.year || ""} · ${al.genre || ""} · ${al.country || ""}`,
          tags: al.tags || []
        });
      }
    });
  }

  // Song
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
          trackRef: t,
          displayMain: t.title,
          displaySub: `${t.artist} – ${t.album} · ${t.genre || ""}`,
          tags: t.tags || []
        });
      }
    });
  }

  if (results.length === 0) {
    searchInfoEl.textContent = `"${qRaw}"에 해당하는 결과가 없습니다.`;
    return;
  } else {
    searchInfoEl.textContent = `"${qRaw}" 검색 결과: ${results.length}개`;
  }

  results.forEach((r) => {
    const item = document.createElement("div");
    item.className = "result-item";

    const typeEl = document.createElement("div");
    typeEl.className = "result-type";
    typeEl.textContent = r.type;

    const mainEl = document.createElement("div");
    mainEl.className = "result-main";
    mainEl.textContent = r.displayMain;

    const subEl = document.createElement("div");
    subEl.className = "result-sub";
    subEl.textContent = r.displaySub;

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
        state.selectedArtist = r.artistName;
        state.selectedAlbumKey = null;
        showExplorer();
        setView("albums");
        renderAlbumPage();
        history.pushState(
          { view: "albums", artist: state.selectedArtist },
          "",
          ""
        );
      } else if (r.type === "Album") {
        const al = r.albumRef;
        state.selectedArtist = al.artist;
        state.selectedAlbumKey = `${al.artist}__${al.title}`;
        showExplorer();
        setView("tracks");
        renderTrackPage();
        history.pushState(
          { view: "tracks", artist: state.selectedArtist, albumKey: state.selectedAlbumKey },
          "",
          ""
        );
      } else if (r.type === "Song") {
        const t = r.trackRef;
        const albumInfo = data.albums.find(
          (al) => al.artist === t.artist && al.title === t.album
        );
        // 검색 결과 화면은 그대로 둔 채 팝업만 띄움 (옵션 A)
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
        openTrackModal(info);
      }
    });

    resultsEl.appendChild(item);
  });
}

function startSearch() {
  const q = searchInput.value.trim();
  if (!q) {
    goHome(false);
    return;
  }
  state.searchQuery = q;
  history.pushState({ view: "search", query: q }, "", "");
  runSearch(true);
}

// ===== Home / 뒤로가기 =====
function goHome(push = true) {
  state.view = "artists";
  state.selectedArtist = null;
  state.selectedAlbumKey = null;
  state.searchQuery = "";
  searchInput.value = "";
  resultsEl.innerHTML = "";
  searchInfoEl.textContent = "검색어를 입력하거나 필터를 조정해보세요.";
  showExplorer();
  setView("artists");
  renderArtistList();
  if (push) {
    history.pushState({ view: "artists" }, "", "");
  }
}

// ===== 초기화 / 이벤트 =====
function initEvents() {
  homeButton.addEventListener("click", () => {
    goHome(true);
  });

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

  // Back 버튼 → 브라우저 history.back()
  backToArtistsBtn.addEventListener("click", () => {
    history.back();
  });
  backToAlbumsBtn.addEventListener("click", () => {
    history.back();
  });

  // 검색 이벤트
  searchButton.addEventListener("click", startSearch);
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") startSearch();
  });
  searchInput.addEventListener("input", () => {
    if (!searchInput.value.trim() && state.view === "search") {
      goHome(true);
    }
  });

  document.querySelectorAll("[data-filter]").forEach((input) => {
    input.addEventListener("change", () => {
      // 항상 비주얼(색상) 업데이트
      getActiveFilters();

      // 검색 화면일 때만 결과 다시 계산
      if (state.view === "search") {
        runSearch(true);
      }
    });
  });

  // 모달 닫기
  modalCloseBtn.addEventListener("click", closeTrackModal);
  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) closeTrackModal();
  });

  // 브라우저 뒤로가기(popstate)
  window.addEventListener("popstate", (e) => {
    const s = e.state || { view: "artists" };
    if (s.view === "artists") {
      state.view = "artists";
      state.selectedArtist = null;
      state.selectedAlbumKey = null;
      showExplorer();
      setView("artists");
      renderArtistList();
    } else if (s.view === "albums") {
      state.view = "albums";
      state.selectedArtist = s.artist || null;
      showExplorer();
      setView("albums");
      renderAlbumPage();
    } else if (s.view === "tracks") {
      state.view = "tracks";
      state.selectedArtist = s.artist || null;
      state.selectedAlbumKey = s.albumKey || null;
      showExplorer();
      setView("tracks");
      renderTrackPage();
    } else if (s.view === "search") {
      state.view = "search";
      state.searchQuery = s.query || "";
      searchInput.value = state.searchQuery;
      runSearch(true);
    }
  });
}

// ===== 초기 렌더 =====
function init() {
  renderInitialButtons();
  renderArtistList();
  setView("artists");
  showExplorer();
  history.replaceState({ view: "artists" }, "", "");
  initEvents();
}

init();
