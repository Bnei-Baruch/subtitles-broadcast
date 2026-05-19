import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

// Shared event-selector dropdown used on both Subtitles and Karaoke pages.
// onRename is optional — omit it to hide the rename button.
const EventDropdown = ({ events, activeEvent, onSelect, onCreate, onDelete, onRename }) => {
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const [newEventInput, setNewEventInput] = useState(false);
  const [newEventName, setNewEventName] = useState("");
  const [renamingEvent, setRenamingEvent] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
        setRenamingEvent(null);
        setNewEventInput(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleToggle = () => {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        top: rect.bottom + 2,
        left: rect.left,
        right: "auto",
        width: rect.width,
        zIndex: 9999,
      });
    }
    setOpen((o) => !o);
  };

  const handleCreate = () => {
    const name = newEventName.trim();
    if (!name) return;
    onCreate(name);
    setNewEventInput(false);
    setNewEventName("");
    setOpen(false);
  };

  const handleRename = (ev) => {
    const name = renameValue.trim();
    if (!name || name === ev) return;
    onRename(ev, name);
    setRenamingEvent(null);
  };

  const allEvents = [...new Set(["", ...events, activeEvent ?? ""])];

  return (
    <div className="event-dropdown-container" ref={containerRef}>
      <button
        className="event-dropdown-trigger"
        onClick={handleToggle}
      >
        <span>{activeEvent === "" ? "Default" : activeEvent}</span>
        <span className="event-dropdown-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && ReactDOM.createPortal(
        <div className="event-dropdown-menu" style={menuStyle} ref={menuRef}>
          {allEvents.map((ev) => (
            <div key={ev} className={`event-dropdown-item${activeEvent === ev ? " active" : ""}`}>
              {renamingEvent === ev ? (
                <span className="event-rename-row">
                  <input
                    autoFocus
                    className="event-rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(ev);
                      if (e.key === "Escape") setRenamingEvent(null);
                    }}
                  />
                  <IconButton size="small" disabled={!renameValue.trim() || renameValue.trim() === ev}
                    onClick={() => handleRename(ev)}>✓</IconButton>
                  <IconButton size="small" onClick={() => setRenamingEvent(null)}>✕</IconButton>
                </span>
              ) : (
                <>
                  <button
                    className="event-dropdown-item-label"
                    onClick={() => { onSelect(ev); setOpen(false); }}
                  >
                    {ev === "" ? "Default" : ev}
                  </button>
                  {ev !== "" && (
                    <span className="event-dropdown-item-actions">
                      {onRename && (
                        <IconButton size="small" title="Rename event"
                          onClick={(e) => { e.stopPropagation(); setRenamingEvent(ev); setRenameValue(ev); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton size="small" title="Delete event"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete event "${ev}" and all its items?`)) {
                            onDelete(ev);
                            setOpen(false);
                          }
                        }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  )}
                </>
              )}
            </div>
          ))}
          <div className="event-dropdown-new">
            {newEventInput ? (
              <span className="event-new-input-row">
                <input
                  autoFocus
                  className="event-rename-input"
                  placeholder="Event name…"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newEventName.trim()) handleCreate();
                    if (e.key === "Escape") { setNewEventInput(false); setNewEventName(""); }
                  }}
                />
                <IconButton size="small" disabled={!newEventName.trim()} onClick={handleCreate}>✓</IconButton>
                <IconButton size="small" onClick={() => { setNewEventInput(false); setNewEventName(""); }}>✕</IconButton>
              </span>
            ) : (
              <button className="event-dropdown-new-btn" onClick={() => setNewEventInput(true)}>
                + New event
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EventDropdown;
