import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import "./PagesCSS/Archive.css";
import { GetSources, DeleteSource } from "../Redux/SourceSlice";
import { UnBookmarkSlide, UpdateBookmarks, GetBookmarks } from "../Redux/BookmarksSlice";
import { Search } from "../Layout/Search";
import { TableVirtuoso } from 'react-virtuoso';
import { Edit } from "../Components/Edit";

const formatDateTimeLocal = (date) => {
  const pad = (n) => n.toString().padStart(2, '0');
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ` +
         `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const getSourceType = (source) => {
  if (source.has_questions && source.has_subtitles) return "S/Q";
  if (source.has_questions) return "Q";
  return "S";
};

const Source = () => {
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "updated_at", dir: "desc" });
  const [filters, setFilters] = useState({ createdBy: "all", updatedBy: "all", lang: "all", type: "all", bookmarked: false });

  const {
    broadcast_language_code: language,
    broadcast_program_code: channel,
  } = useSelector((state) => state.userSettings.userSettings);

  const { username } = useSelector((state) => state.UserProfile.userProfile);

  const confirmDelete = (source) => {
    const otherLangs = (source.languages || []).filter((l) => l !== language);
    if (otherLangs.length > 0) {
      if (!window.confirm(`This source also exists in other languages: ${otherLangs.join(", ")}. Are you sure you want to delete it? Continue?`)) return false;
    }
    if (source.created_by && source.created_by !== username) {
      if (!window.confirm(`This source was created by ${source.created_by}, not you. Are you sure?`)) return false;
    }
    return true;
  };

  const { sources } = useSelector((state) => state.sources);
	const { bookmarks } = useSelector((state) => state.bookmarks);

  const [{editSlideId, editFileUid}, setEdit] = useState({ editSlideId: null, editFileUid: null });
  const [showDeleted, setShowDeleted] = useState(false);

  const uniqueCreatedBy = [...new Set(sources.map((s) => s.created_by).filter(Boolean))].sort();
  const uniqueUpdatedBy = [...new Set(sources.map((s) => s.updated_by).filter(Boolean))].sort();
  const uniqueLangs = [...new Set(sources.flatMap((s) => s.languages || []))].sort();

  const filtered = sources.filter((s) => {
    const type = getSourceType(s);
    if (filters.createdBy !== "all" && s.created_by !== filters.createdBy) return false;
    if (filters.updatedBy !== "all" && s.updated_by !== filters.updatedBy) return false;
    if (filters.lang === "multi" && (s.languages || []).length < 2) return false;
    if (filters.lang !== "all" && filters.lang !== "multi" && !(s.languages || []).includes(filters.lang)) return false;
    if (filters.type !== "all" && type !== filters.type) return false;
    if (filters.bookmarked && !s.bookmark_id) return false;
    return true;
  });

  const sortedSources = [...filtered].sort((a, b) => {
    if (!sort.field) return 0;
    let av = sort.field === "type" ? getSourceType(a) : sort.field === "languages" ? (a.languages || []).length : a[sort.field];
    let bv = sort.field === "type" ? getSourceType(b) : sort.field === "languages" ? (b.languages || []).length : b[sort.field];
    const cmp = typeof av === "string" ? av.localeCompare(bv) : (av > bv ? 1 : av < bv ? -1 : 0);
    return sort.dir === "asc" ? cmp : -cmp;
  });

  const SortTh = ({ field, label, style }) => (
    <th
      className="text-truncate"
      style={{ ...style, cursor: "pointer", userSelect: "none" }}
      onClick={() => setSort((prev) => ({ field, dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc" }))}
    >
      {label}{sort.field === field ? (sort.dir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );

  const refetchSources = useCallback((read_after_write = undefined) => {
    console.log(`Refresh with read_after_write: ${read_after_write}`);
    return Promise.all([
      // Update number of bookmarks.
      dispatch(GetBookmarks({ language, channel, read_after_write })),
      // Update sources.
      dispatch(GetSources({
        language,
        channel,
        keyword: search,
        hidden: showDeleted ? "true" : undefined,
        read_after_write: read_after_write ? "true" : undefined,
      })),
    ]);
  }, [dispatch, search, language, channel, showDeleted]);

  useEffect(() => {
    refetchSources();
  }, [refetchSources]);

  const handleEditSlide = (slide) => {
    setEdit({ editSlideId: slide.slide_id, editFileUid: slide.file_uid });
  };

  return (
    <>
      {editSlideId &&
        <Edit fileUid={editFileUid}
              slideId={editSlideId}
              handleClose={() => {
                refetchSources().finally(() => {
                  setEdit({editSlideId: null, editFileUid: null});
                });
              }} />}
      {!editSlideId && 
      <div
        className="archiveBackground bg-light Edit"
        style={{ position: "relative" }}
      >
        <div className="flex-container">
          <div className="top-autocomplete">
            <div style={{ maxWidth: 400, width: "100%", flexShrink: 0 }}>
              <Search search={search} searchChanged={setSearch} />
            </div>
            <div style={{ flex: 1 }} />
            <div className="d-flex gap-2 align-items-center flex-nowrap overflow-auto">
              <select className="form-select form-select-sm w-auto" value={filters.createdBy} onChange={(e) => setFilters((f) => ({ ...f, createdBy: e.target.value }))}>
                <option value="all">Created By: All</option>
                {uniqueCreatedBy.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <select className="form-select form-select-sm w-auto" value={filters.updatedBy} onChange={(e) => setFilters((f) => ({ ...f, updatedBy: e.target.value }))}>
                <option value="all">Updated By: All</option>
                {uniqueUpdatedBy.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <select className="form-select form-select-sm w-auto" value={filters.lang} onChange={(e) => setFilters((f) => ({ ...f, lang: e.target.value }))}>
                <option value="all">Lang: All</option>
                <option value="multi">Multi-lingual</option>
                {uniqueLangs.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <select className="form-select form-select-sm w-auto" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}>
                <option value="all">Type: All</option>
                <option value="S">S only</option>
                <option value="Q">Q only</option>
                <option value="S/Q">S/Q</option>
              </select>
              <div className="form-check mb-0 text-nowrap">
                <input className="form-check-input me-1" type="checkbox" id="filterBookmarked" checked={filters.bookmarked} onChange={(e) => setFilters((f) => ({ ...f, bookmarked: e.target.checked }))} />
                <label className="form-check-label" htmlFor="filterBookmarked">Bookmarked only</label>
              </div>
              <div className="form-check mb-0 text-nowrap">
                <input className="form-check-input me-1" type="checkbox" id="filterDeleted" checked={showDeleted} onChange={() => setShowDeleted(!showDeleted)} />
                <label className="form-check-label" htmlFor="filterDeleted">Show deleted</label>
              </div>
            </div>
            <span>{sortedSources.length}</span>
          </div>
        </div>
        <div className="card sources-container" style={{ border: "none" }}>
          <TableVirtuoso
            data={sortedSources}
            fixedHeaderContent={() => (
              <tr>
                <SortTh field="path" label="Path" style={{ width: "20%", padding: "10px" }} />
                <SortTh field="slides_count" label="#" />
                <SortTh field="languages" label="Lang" />
                <SortTh field="type" label="Type" />
                <SortTh field="created_by" label="Created By" />
                <SortTh field="created_at" label="Created At" />
                <SortTh field="updated_by" label="Updated By" />
                <SortTh field="updated_at" label="Updated At" />
                <th className="text-truncate" style={{ width: "15%", padding: "10px" }}>Action</th>
              </tr>
            )}
            itemContent={(index, source) => {
              const bm = source.bookmark_id !== null ? "bookmarked-cell" : "";
              return (
              <>
                <td className={`text-truncate ${bm}`} style={{ padding: "10px" }}>
                  {source.path}
                </td>
                <td className={`text-truncate ${bm}`} style={{ padding: "10px" }}>
                  {source.slides_count}
                </td>
                <td className={`text-truncate ${bm}`}>
                  {(source.languages || []).map((l) => (
                    <span key={l} className="badge bg-secondary me-1">{l}</span>
                  ))}
                </td>
                <td className={`text-truncate ${bm}`}>{getSourceType(source)}</td>
                <td className={`text-truncate ${bm}`}>{source.created_by}</td>
                <td className={`text-truncate ${bm}`}>
                  {formatDateTimeLocal(new Date(source.created_at))}
                </td>
                <td className={`text-truncate ${bm}`}>{source.updated_by}</td>
                <td className={`text-truncate ${bm}`}>
                  {formatDateTimeLocal(new Date(source.updated_at))}
                </td>
                <td className={`text-truncate ${bm}`} style={{ padding: "10px" }}>
                  {source.bookmark_id !== null ? (
                    <i
                      onClick={async () => {
                        await dispatch(UnBookmarkSlide({ 
                          bookmark_id: source.bookmark_id,
                        }));
                        refetchSources(/* read_after_write */ true);
                      }}
                      className="bi bi-bookmark-check-fill m-2 cursor-pointer "
                    />
                  ) : (
                    <i
                      onClick={async () => {
                        await dispatch(UpdateBookmarks({
                          bookmarks: [{
                            file_uid: source.file_uid,
                            slide_id: source.slide_id,
                            order_number: bookmarks.length,
                          }],
                          language,
                          channel,
                          update: false,
                        }));
                        refetchSources(/* read_after_write */ true);
                      }}
                      className="bi bi-bookmark m-2 cursor-pointer "
                    />
                  )}
                  <i
                    className="bi bi-pencil m-2 cursor-pointer "
                    onClick={() => handleEditSlide(source)}
                  />
                  <span
                    className="position-relative cursor-pointer"
                    data-bs-toggle="tooltip"
                    data-bs-placement="right"
                    title={source.hidden ? "Undelete" : "Delete"}
                    onClick={async () => {
                      if (source.hidden) {
                        await dispatch(DeleteSource({
                          hidden: true,  // Undelete
                          source_uid: source.source_uid,
                          path: source.path,
                          language,
                        }));
                        refetchSources(/* read_after_write */ true);
                      } else {
                        if (!confirmDelete(source)) return;
                        if (source.bookmark_id) {
                          if (window.confirm(`This source has bookmark, are you sure you want to delete the bookmark and the source: ${source.path}`)) {
                            await dispatch(UnBookmarkSlide({
                              bookmark_id: source.bookmark_id,
                            }));
                            await dispatch(DeleteSource({
                              source_uid: source.source_uid,
                              path: source.path,
                              language,
                            }));
                            refetchSources(/* read_after_write */ true);
                          }
                        } else if (window.confirm(`Are you sure you want to delete: ${source.path}`)) {
                          await dispatch(DeleteSource({
                            source_uid: source.source_uid,
                            path: source.path,
                            language,
                          }));
                          refetchSources(/* read_after_write */ true);
                        }
                      }
                    }}
                  >
                    <i className="bi bi-trash3"></i>
                    {source.hidden && (
                      <i className="bi bi-x-circle-fill text-danger position-absolute top-0 start-100 translate-middle fs-6"></i>
                    )}
                  </span>
                  {source.hidden && (
                    <i
                      className="bi bi-trash3-fill text-danger"
                      style={{ marginLeft: "30px" }}
                      data-bs-toggle="tooltip"
                      data-bs-placement="right"
                      title="Delete forever"
                      onClick={async () => {
                        console.log('Delete forever');
                        if (!confirmDelete(source)) return;
                        if (window.confirm(`Are you sure you want to FOREVER delete: ${source.path}`)) {
                          await dispatch(DeleteSource({
                            forever: true,
                            source_uid: source.source_uid,
                            path: source.path,
                            language,
                          }));
                          refetchSources(/* read_after_write */ true);
                        }
                      }}
                    ></i>
                  )}
                </td>
              </>
            );}}
          />
        </div>
      </div>
      }
    </>
  );
};

export default Source;
