import React, { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import KeyboardDoubleArrowLeftIcon from "@mui/icons-material/KeyboardDoubleArrowLeft";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

import {
  KARAOKE_GROUPS,
  GetKaraokeSongs,
  GetKaraokeSlides,
  GetKaraokeSetlist,
  GetKaraokePresets,
  ImportKaraokeFile,
  DeleteKaraokeSong,
  RestoreKaraokeSong,
  AddToSetlist,
  RemoveFromSetlist,
  ReorderSetlist,
  CreateKaraokePreset,
  DeleteKaraokePreset,
  RenameKaraokePreset,
  UpdateKaraokeSongName,
  setActiveSong,
  setActiveSlideIndex,
  setActiveGroup,
  setActiveKaraokePreset,
} from "../Redux/KaraokeSlice";
import { publishKaraoke, clearKaraoke, publishDisplyNoneMqttMessage } from "../Utils/UseMqttUtils";
import { setLiveModeEnabled, setSubtitlesDisplayMode } from "../Redux/MQTT/mqttSlice";
import { clearSlices } from "../Redux/SlidesSlice";
import { DM_NONE, DM_SUBTITLES, DM_QUESTIONS, DM_KARAOKE } from "../Utils/Const";
import { showSuccessToast, getKaraokeMqttTopic, isNonLatinScript } from "../Utils/Common";
import EventDropdown from "../Components/EventDropdown";
import { Edit } from "../Components/Edit";
import Preview from "../Components/Preview";
import "./PagesCSS/Karaoke.css";

const GROUP_LABELS = { "": "All", songbook: "Songbook", shabat: "Shabat", origin: "Origin", general: "General" };

const SETLIST_DRAG_TYPE = "karaoke-setlist-item";

const DraggableSetlistItem = ({ item, idx, isActive, displayName, onSelect, onRemove, moveCard, onDragEnd }) => {
  const ref = useRef(null);

  const [, drag] = useDrag({
    type: SETLIST_DRAG_TYPE,
    item: { index: idx },
    end: onDragEnd,
  });

  const [, drop] = useDrop({
    accept: SETLIST_DRAG_TYPE,
    hover: (dragged) => {
      if (dragged.index !== idx) {
        moveCard(dragged.index, idx);
        dragged.index = idx;
      }
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`setlist-item${isActive ? " active" : ""}`}
      onClick={() => onSelect(item.file_uid)}
      style={{ cursor: "grab" }}
    >
      <DragIndicatorIcon fontSize="small" sx={{ color: isActive ? "#aac" : "#ccc", flexShrink: 0 }} />
      <span className="setlist-num">{idx + 1}</span>
      <span className="setlist-name" title={displayName}>{displayName}</span>
      <div className="setlist-actions">
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  );
};

const Karaoke = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const slidesListRef = useRef(null);
  const resizingRef = useRef(null);
  const [libraryWidth, setLibraryWidth] = useState(500);
  const [setlistWidth, setSetlistWidth] = useState(400);
  const [libraryOpen, setLibraryOpen] = useState(
    () => localStorage.getItem("karaokeLibraryOpen") === "true"
  );
  const [slidesFontSize, setSlidesFontSize] = useState(13);
  const [librarySearch, setLibrarySearch] = useState("");
  const [slideSearch, setSlideSearch] = useState("");
  const [confirmDeleteSourceUid, setConfirmDeleteSourceUid] = useState(null);
  const [importGroup, setImportGroup] = useState("general");
  const [importProgress, setImportProgress] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const [editingSongName, setEditingSongName] = useState(null); // { sourceUid, sourcePathId, value }
  const [editMode, setEditMode] = useState(false);
  const [localSetlist, setLocalSetlist] = useState([]);

  const { songs, setlist, slides, activeSongFileUid, activeSlideIndex, activeGroup, karaokePresets, activeKaraokePreset } = useSelector(
    (state) => state.karaoke
  );
  const { broadcast_program_code: channel, broadcast_language_code: language } = useSelector(
    (state) => state.userSettings.userSettings
  );
  const { isLiveModeEnabled, subtitlesDisplayMode, isOnAir, mqttTopics, mqttMessages } = useSelector(
    (state) => state.mqtt
  );
  const subscribed = mqttTopics[getKaraokeMqttTopic(channel)];

  const isKaraokeActive = subtitlesDisplayMode === "karaoke";

  useEffect(() => {
    localStorage.setItem("karaokeLibraryOpen", String(libraryOpen));
  }, [libraryOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(GetKaraokeSongs({ group: activeGroup, showHidden, keyword: librarySearch }));
    }, librarySearch ? 300 : 0);
    return () => clearTimeout(timer);
  }, [dispatch, activeGroup, showHidden, librarySearch]);

  useEffect(() => {
    if (channel) {
      dispatch(GetKaraokePresets({ channel }));
    }
  }, [dispatch, channel]);

  useEffect(() => {
    if (channel) {
      dispatch(GetKaraokeSetlist({ channel, preset: activeKaraokePreset }));
    }
  }, [dispatch, channel, activeKaraokePreset]);

  useEffect(() => {
    setLocalSetlist(setlist);
  }, [setlist]);

  const handleGroupChange = useCallback(
    (group) => {
      dispatch(setActiveGroup(group));
    },
    [dispatch]
  );

  const IMPORT_CONCURRENCY = 3;

  const handleImport = useCallback(
    async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      e.target.value = "";

      if (files.length === 1) {
        const formData = new FormData();
        formData.append("file", files[0]);
        formData.append("group", importGroup);
        const result = await dispatch(ImportKaraokeFile({ formData }));
        if (!result.error) dispatch(GetKaraokeSongs({ group: activeGroup }));
        return;
      }

      let done = 0;
      let errors = 0;
      setImportProgress({ done: 0, total: files.length, errors: 0 });

      for (let i = 0; i < files.length; i += IMPORT_CONCURRENCY) {
        const batch = files.slice(i, i + IMPORT_CONCURRENCY);
        const results = await Promise.allSettled(
          batch.map((file) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("group", importGroup);
            return dispatch(ImportKaraokeFile({ formData }));
          })
        );
        results.forEach((r) => {
          done++;
          if (r.status === "rejected" || r.value?.error) errors++;
        });
        setImportProgress({ done, total: files.length, errors });
      }

      dispatch(GetKaraokeSongs({ group: activeGroup }));
      setImportProgress(null);
    },
    [dispatch, importGroup, activeGroup]
  );

  const handleSelectSong = useCallback(
    (fileUid) => {
      if (activeSongFileUid === fileUid) return;
      setEditMode(false);
      dispatch(setActiveSong(fileUid));
      dispatch(GetKaraokeSlides({ file_uid: fileUid }));
    },
    [dispatch, activeSongFileUid]
  );

  const handleAddToSetlist = useCallback(
    (fileUid) => {
      dispatch(AddToSetlist({ file_uid: fileUid, channel, preset: activeKaraokePreset })).then((result) => {
        if (!result.error) {
          dispatch(GetKaraokeSetlist({ channel, preset: activeKaraokePreset }));
          dispatch(GetKaraokePresets({ channel }));
        }
      });
    },
    [dispatch, channel, activeKaraokePreset]
  );

  const handleRemoveFromSetlist = useCallback(
    (id) => {
      dispatch(RemoveFromSetlist({ id }));
    },
    [dispatch]
  );

  const moveSetlistCard = useCallback((fromIndex, toIndex) => {
    setLocalSetlist((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const handleSetlistReorderEnd = useCallback(() => {
    setLocalSetlist((current) => {
      dispatch(ReorderSetlist({ items: current.map((item, i) => ({ id: item.id, order_number: i })) }));
      return current;
    });
  }, [dispatch]);

  const handleDeleteSong = useCallback(
    (sourceUid) => {
      const deletedSong = songs.find((s) => s.source_uid === sourceUid);
      dispatch(DeleteKaraokeSong({ source_uid: sourceUid })).then((result) => {
        if (!result.error) {
          // Remove from every setlist entry that uses this song's file_uid
          if (deletedSong) {
            const toRemove = setlist.filter((s) => s.file_uid === deletedSong.file_uid);
            toRemove.forEach((s) => dispatch(RemoveFromSetlist({ id: s.id })));
          }
          dispatch(GetKaraokeSongs({ group: activeGroup, showHidden }));
          dispatch(GetKaraokeSetlist({ channel, preset: activeKaraokePreset }));
        }
      });
      setConfirmDeleteSourceUid(null);
    },
    [dispatch, activeGroup, showHidden, channel, activeKaraokePreset, songs, setlist]
  );

  const handleRestoreSong = useCallback(
    (sourceUid) => {
      dispatch(RestoreKaraokeSong({ source_uid: sourceUid })).then((result) => {
        if (!result.error) {
          dispatch(GetKaraokeSongs({ group: activeGroup, showHidden }));
        }
      });
    },
    [dispatch, activeGroup, showHidden]
  );

  const handleSaveSongName = useCallback(() => {
    if (!editingSongName) return;
    const { sourceUid, sourcePathId, value } = editingSongName;
    const trimmed = value.trim();
    if (trimmed && sourcePathId) {
      dispatch(UpdateKaraokeSongName({ sourcePathId, name: trimmed, sourceUid }));
    }
    setEditingSongName(null);
  }, [dispatch, editingSongName]);

  const enterEditMode = useCallback(() => setEditMode(true), []);

  // Karaoke editing now uses the shared <Edit mode="karaoke">. On close, reload
  // the song's slides so the main list reflects any edits/additions/deletions.
  const handleEditClose = useCallback(() => {
    setEditMode(false);
    // <Edit mode="karaoke"> loaded karaoke rows into the shared state.slides;
    // clear them so they aren't persisted forward into the Subtitles list.
    dispatch(clearSlices());
    if (activeSongFileUid) dispatch(GetKaraokeSlides({ file_uid: activeSongFileUid }));
  }, [dispatch, activeSongFileUid]);

  const handleResizeStart = useCallback((col, e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = col === "library" ? libraryWidth : setlistWidth;
    resizingRef.current = col;

    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      // The library handle sits on the library's right edge (drag right = wider);
      // the preset column is now rightmost with its handle on its left edge, so
      // its width grows as you drag left.
      const next = Math.max(120, Math.min(600, startWidth + (col === "setlist" ? -delta : delta)));
      if (col === "library") setLibraryWidth(next);
      else setSetlistWidth(next);
    };
    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [libraryWidth, setlistWidth]);

  const handleSelectSlide = useCallback(
    (slide) => {
      dispatch(setActiveSlideIndex(slide.order_number));
      if (isLiveModeEnabled && subtitlesDisplayMode === DM_KARAOKE) {
        publishKaraoke(slide, channel);
      }
    },
    [dispatch, channel, isLiveModeEnabled, subtitlesDisplayMode]
  );

  const navigateSlide = useCallback(
    (delta) => {
      const currentIdx = slides.findIndex((s) => s.order_number === activeSlideIndex);
      const nextIdx = currentIdx + delta;
      if (nextIdx < 0 || nextIdx >= slides.length) return;
      handleSelectSlide(slides[nextIdx]);
    },
    [slides, activeSlideIndex, handleSelectSlide]
  );

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        navigateSlide(1);
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        navigateSlide(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigateSlide]);

  // Scroll active slide so 1 previous slide is still visible above it
  useEffect(() => {
    if (activeSlideIndex !== null && slidesListRef.current) {
      const el = slidesListRef.current.querySelector(`[data-order="${activeSlideIndex}"]`);
      if (el) {
        const prev1 = el.previousElementSibling;
        const prev2 = prev1?.previousElementSibling;
        const isRightColumn = !!el.parentElement?.previousElementSibling;
        if (prev2) {
          const containerRect = slidesListRef.current.getBoundingClientRect();
          const prev2Rect = prev2.getBoundingClientRect();
          const top = slidesListRef.current.scrollTop + prev2Rect.top - containerRect.top;
          slidesListRef.current.scrollTo({ top, behavior: "smooth" });
        } else if (!prev1 && isRightColumn) {
          slidesListRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    }
  }, [activeSlideIndex, slideSearch]);

  const handleToggleLiveMode = useCallback(() => {
    dispatch(setLiveModeEnabled(!isLiveModeEnabled));
  }, [dispatch, isLiveModeEnabled]);

  const filteredSongs = songs;

  const activeSlide = activeSlideIndex !== null
    ? slides.find((s) => s.order_number === activeSlideIndex)
    : null;

  const activeSongInSetlist = setlist.find((s) => s.file_uid === activeSongFileUid);

  return (
    <div className="karaoke-page">
      {/* Top bar */}
      <div className="karaoke-topbar">
        <span className="karaoke-title">Karaoke</span>
        <div className="btn-group" role="group">
          <button
            className={`live-button btn ${isLiveModeEnabled ? "btn-danger" : "btn-outline-danger"}`}
            onClick={handleToggleLiveMode}
          >
            {isLiveModeEnabled ? "Live: ON" : "Live: OFF"}
          </button>
          <button
            disabled={!isLiveModeEnabled || !subscribed}
            type="button"
            className={`btn sources-mod${subtitlesDisplayMode === DM_SUBTITLES ? " btn-success display-mod-selected" : ""}`}
            onClick={() => dispatch(setSubtitlesDisplayMode(DM_SUBTITLES))}
          >
            Subtitles
          </button>
          <button
            disabled={!isLiveModeEnabled || !subscribed}
            type="button"
            className={`btn questions-mod${subtitlesDisplayMode === DM_QUESTIONS ? " btn-success display-mod-selected" : ""}`}
            onClick={() => dispatch(setSubtitlesDisplayMode(DM_QUESTIONS))}
          >
            Questions
          </button>
          <button
            disabled={!isLiveModeEnabled || !subscribed}
            type="button"
            className={`btn karaoke-mod${subtitlesDisplayMode === DM_KARAOKE ? " btn-success display-mod-selected" : ""}`}
            onClick={() => {
              dispatch(setSubtitlesDisplayMode(DM_KARAOKE));
              if (activeSlide) {
                publishKaraoke(activeSlide, channel);
              }
            }}
          >
            Karaoke
          </button>
          <button
            disabled={!isLiveModeEnabled || !subscribed}
            type="button"
            className={`btn none-mod${subtitlesDisplayMode === DM_NONE ? " btn-success display-mod-selected" : ""}`}
            onClick={() => {
              publishDisplyNoneMqttMessage(mqttMessages, channel, language);
              clearKaraoke(channel, true);
              dispatch(setSubtitlesDisplayMode(DM_NONE));
            }}
          >
            None
          </button>
        </div>
        <span className={`karaoke-onair-badge badge on-air-badge ${isOnAir ? "on-air" : "off-air"}`}>
          {isOnAir ? "● ON AIR" : "● OFF AIR"}
        </span>
      </div>

      <DndProvider backend={HTML5Backend}>
      <div className={`karaoke-columns${editMode ? " edit-mode" : ""}`}>
        {/* Left: Song Library */}
        <div
          className={`karaoke-library karaoke-panel${libraryOpen ? "" : " library-collapsed"}`}
          style={libraryOpen ? { flex: `0 0 ${libraryWidth}px`, minWidth: `${libraryWidth}px` } : undefined}
        >
          <div className="panel-header">
            {libraryOpen ? (
              <>
                <span>Song Library</span>
                <IconButton size="small" onClick={() => setLibraryOpen(false)} title="Collapse library" style={{ marginLeft: "auto" }}>
                  <KeyboardDoubleArrowLeftIcon fontSize="small" />
                </IconButton>
              </>
            ) : (
              <IconButton size="small" onClick={() => { setLibraryOpen(true); if (libraryWidth < 200) setLibraryWidth(280); }} title="Expand library">
                <KeyboardDoubleArrowRightIcon fontSize="small" />
              </IconButton>
            )}
          </div>
          {libraryOpen && (
            <div className="library-import-bar" onClick={(e) => e.stopPropagation()}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pptx,.docx"
                multiple
                onChange={handleImport}
                style={{ display: "none" }}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                disabled={!!importProgress}
                onClick={() => fileInputRef.current?.click()}
              >
                Import to
              </Button>
              <select
                className="group-select"
                value={importGroup}
                onChange={(e) => setImportGroup(e.target.value)}
                title="Destination group for import"
              >
                {KARAOKE_GROUPS.map((g) => (
                  <option key={g} value={g}>{GROUP_LABELS[g]}</option>
                ))}
              </select>
            </div>
          )}

          {libraryOpen && importProgress && (
            <div className="import-progress-container">
              <div className="import-progress-bar-track">
                <div
                  className="import-progress-bar-fill"
                  style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                />
              </div>
              <span className="import-progress-label">
                {importProgress.done}/{importProgress.total} imported
                {importProgress.errors > 0 ? ` (${importProgress.errors} failed)` : ""}
              </span>
            </div>
          )}
          {libraryOpen && <>
          {/* Group filter tabs */}
          <div className="group-tabs">
            {["", ...KARAOKE_GROUPS].map((g) => (
              <button
                key={g}
                className={`group-tab${activeGroup === g ? " active" : ""}`}
                onClick={() => handleGroupChange(g)}
              >
                {GROUP_LABELS[g]}
              </button>
            ))}
            <button
              className={`library-sort-btn group-tab-trash${showHidden ? " active" : ""}`}
              title={showHidden ? "Hide deleted songs" : "Show deleted songs"}
              onClick={() => setShowHidden((v) => !v)}
              style={{ marginLeft: "auto" }}
            >
              🗑
            </button>
          </div>

          <input
            className="karaoke-search"
            placeholder="Search songs..."
            value={librarySearch}
            onChange={(e) => setLibrarySearch(e.target.value)}
          />
          <div className="song-list">
            {filteredSongs.map((song) => {
              const songFileUid = song.file_uid;
              const songSourceUid = song.source_uid;
              const displayName = song.path || song.filename || songSourceUid;
              const isEditingThis = editingSongName?.sourceUid === songSourceUid;
              const inSetlist = setlist.some((s) => s.file_uid === songFileUid);
              const isLoaded = activeSongFileUid === songFileUid;
              return (
                <div
                  key={songSourceUid || songFileUid}
                  className={`song-item${isLoaded ? " loaded" : ""}${song.hidden ? " song-hidden" : ""}`}
                  onClick={() => !isEditingThis && handleSelectSong(songFileUid)}
                >
                  <div className="song-item-name" title={displayName}>
                    {isEditingThis ? (
                      <input
                        className="song-name-input"
                        autoFocus
                        value={editingSongName.value}
                        placeholder={song.filename || songSourceUid}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditingSongName((prev) => ({ ...prev, value: e.target.value }))}
                        onBlur={handleSaveSongName}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveSongName();
                          if (e.key === "Escape") setEditingSongName(null);
                        }}
                      />
                    ) : (
                      <>
                        <span>{displayName}</span>
                        {!song.hidden && (
                          <IconButton
                            size="small"
                            className="song-name-edit-btn"
                            title="Rename song"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSongName({ sourceUid: songSourceUid, sourcePathId: song.source_path_id, value: song.path || song.filename || "" });
                            }}
                          >
                            <EditIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        )}
                      </>
                    )}
                  </div>
                  <div className="song-item-meta">{song.slides_count ?? song.slide_count} slides</div>
                  {song.source_group && song.source_group !== activeGroup && (
                    <div className="song-item-group">{GROUP_LABELS[song.source_group] || song.source_group}</div>
                  )}
                  <div className="song-item-actions">
                    {song.hidden ? (
                      <Button size="small" color="success" onClick={(e) => { e.stopPropagation(); handleRestoreSong(songSourceUid); }}>
                        Restore
                      </Button>
                    ) : (
                      <>
                        {!inSetlist && (
                          <IconButton
                            size="small"
                            title="Add to setlist"
                            onClick={(e) => { e.stopPropagation(); handleAddToSetlist(songFileUid); }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        )}
                        {confirmDeleteSourceUid === songSourceUid ? (
                          <>
                            <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); handleDeleteSong(songSourceUid); }}>
                              Confirm
                            </Button>
                            <Button size="small" onClick={(e) => { e.stopPropagation(); setConfirmDeleteSourceUid(null); }}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <IconButton
                            size="small"
                            title="Delete song"
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteSourceUid(songSourceUid); }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredSongs.length === 0 && (
              <div className="empty-hint">No songs yet. Import a PPTX file.</div>
            )}
          </div>
          </>}
        </div>

        {/* Resize handle: library | setlist */}
        {libraryOpen && (
          <div className="resize-handle resize-handle-lib" onMouseDown={(e) => handleResizeStart("library", e)} />
        )}

        {/* Middle: Setlist */}
        <div
          className="karaoke-setlist karaoke-panel"
          style={{ flex: `0 0 ${setlistWidth}px`, minWidth: `${setlistWidth}px` }}
        >
          <div className="karaoke-setlist-preview">
            <Preview />
          </div>
          <div className="panel-header">
            <span>Presets</span>
          </div>
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #ddd", flexShrink: 0 }}>
            <EventDropdown
              events={karaokePresets}
              activeEvent={activeKaraokePreset}
              onSelect={(ev) => dispatch(setActiveKaraokePreset(ev))}
              onCreate={(name) => { dispatch(CreateKaraokePreset({ channel, preset: name })); dispatch(setActiveKaraokePreset(name)); }}
              onDelete={(ev) => dispatch(DeleteKaraokePreset({ channel, preset: ev })).then((r) => { if (!r.error) dispatch(GetKaraokePresets({ channel })); })}
              onRename={(ev, newName) => dispatch(RenameKaraokePreset({ channel, preset: ev, new_preset: newName })).then((r) => { if (!r.error) dispatch(GetKaraokePresets({ channel })); })}
            />
          </div>
          <div className="setlist-list">
            {localSetlist.map((item, idx) => {
              const setlistSong = songs.find((s) => s.file_uid === item.file_uid);
              return (
              <DraggableSetlistItem
                key={item.id ?? item.ID}
                item={item}
                idx={idx}
                displayName={setlistSong?.path || item.filename || item.file_uid}
                isActive={activeSongFileUid === item.file_uid}
                onSelect={handleSelectSong}
                onRemove={handleRemoveFromSetlist}
                moveCard={moveSetlistCard}
                onDragEnd={handleSetlistReorderEnd}
              />
              );
            })}
            {setlist.length === 0 && (
              <div className="empty-hint">Add songs from the library using +</div>
            )}
          </div>
        </div>

        {/* Resize handle: slides | green-preview+presets */}
        <div className="resize-handle resize-handle-set" onMouseDown={(e) => handleResizeStart("setlist", e)} />

        {/* Right: Slides */}
        <div className="karaoke-content karaoke-panel">
          {editMode ? (
            <Edit fileUid={activeSongFileUid} handleClose={handleEditClose} mode="karaoke" />
          ) : (
          <>
          <div className="slides-size-bar">
            <IconButton size="small" onClick={() => setSlidesFontSize((s) => Math.max(9, s - 1))}>A−</IconButton>
            <span className="slides-size-label">{slidesFontSize}px</span>
            <IconButton size="small" onClick={() => setSlidesFontSize((s) => Math.min(24, s + 1))}>A+</IconButton>
            <input
              className="slide-search-input"
              placeholder="Search slides…"
              value={slideSearch}
              onChange={(e) => setSlideSearch(e.target.value)}
            />
            {slides.length > 0 && (
              <IconButton size="small" title="Edit slides" onClick={enterEditMode} sx={{ ml: "auto" }}>
                <EditIcon fontSize="small" />
              </IconButton>
            )}
          </div>
          <div className="karaoke-slides-list" ref={slidesListRef} style={{ fontSize: slidesFontSize }}>
            {slides.length === 0 && (
              <div className="empty-hint">Click a song to load its slides</div>
            )}
            {slides.length > 0 && (() => {
              const keyword = slideSearch.trim().toLowerCase();
              const highlight = (text) => {
                if (!keyword) return text;
                const idx = text.toLowerCase().indexOf(keyword);
                if (idx === -1) return text;
                return (
                  <>
                    {text.slice(0, idx)}
                    <mark className="slide-search-highlight">{text.slice(idx, idx + keyword.length)}</mark>
                    {text.slice(idx + keyword.length)}
                  </>
                );
              };
              const visibleSlides = keyword
                ? slides.filter((s) => s.slide.toLowerCase().includes(keyword))
                : slides;
              const half = Math.ceil(visibleSlides.length / 2);
              const renderSlide = (slide) => {
                const isActive = activeSlideIndex === slide.order_number;
                const lines = slide.slide.split("\n");
                const firstLine = lines[0] || "";
                const secondLine = lines[1] || "";
                const sameLangSlide = secondLine && !isNonLatinScript(firstLine) && !isNonLatinScript(secondLine);
                return (
                  <div
                    key={slide.ID}
                    data-order={slide.order_number}
                    className={`slide-card${isActive ? " active" : ""}`}
                    onClick={() => { if (keyword) setSlideSearch(""); handleSelectSlide(slide); }}
                  >
                    <span className="slide-num">{slide.order_number + 1}</span>
                    <span className="slide-text-preview">
                      <span>{highlight(firstLine.slice(0, 80))}</span>
                      {sameLangSlide && (
                        <span className="slide-text-secondary">{highlight(secondLine.slice(0, 80))}</span>
                      )}
                    </span>
                  </div>
                );
              };
              return (
                <>
                  <div className="slides-column">{visibleSlides.slice(0, half).map(renderSlide)}</div>
                  <div className="slides-column">{visibleSlides.slice(half).map(renderSlide)}</div>
                </>
              );
            })()}
          </div>
          </>
          )}
        </div>
      </div>
      </DndProvider>
    </div>
  );
};

export default Karaoke;
