import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

// Shared preset-selector dropdown used on both Subtitles and Karaoke pages.
// onRename is optional — omit it to hide the rename button.
const EventDropdown = ({ events: presets, activeEvent: activePreset, onSelect, onCreate, onDelete, onRename }) => {
  const containerRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const [newPresetInput, setNewPresetInput] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [renamingPreset, setRenamingPreset] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        menuRef.current && !menuRef.current.contains(e.target)
      ) {
        setOpen(false);
        setRenamingPreset(null);
        setNewPresetInput(false);
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
    const name = newPresetName.trim();
    if (!name) return;
    onCreate(name);
    setNewPresetInput(false);
    setNewPresetName("");
    setOpen(false);
  };

  const handleRename = (p) => {
    const name = renameValue.trim();
    if (!name || name === p) return;
    onRename(p, name);
    setRenamingPreset(null);
  };

  const allPresets = [...new Set(["", ...presets, activePreset ?? ""])];

  return (
    <div className="event-dropdown-container" ref={containerRef}>
      <button
        className="event-dropdown-trigger"
        onClick={handleToggle}
      >
        <span>{activePreset === "" ? "Default" : activePreset}</span>
        <span className="event-dropdown-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && ReactDOM.createPortal(
        <div className="event-dropdown-menu" style={menuStyle} ref={menuRef}>
          {allPresets.map((p) => (
            <div key={p} className={`event-dropdown-item${activePreset === p ? " active" : ""}`}>
              {renamingPreset === p ? (
                <span className="event-rename-row">
                  <input
                    autoFocus
                    className="event-rename-input"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(p);
                      if (e.key === "Escape") setRenamingPreset(null);
                    }}
                  />
                  <IconButton size="small" disabled={!renameValue.trim() || renameValue.trim() === p}
                    onClick={() => handleRename(p)}>✓</IconButton>
                  <IconButton size="small" onClick={() => setRenamingPreset(null)}>✕</IconButton>
                </span>
              ) : (
                <>
                  <button
                    className="event-dropdown-item-label"
                    onClick={() => { onSelect(p); setOpen(false); }}
                  >
                    {p === "" ? "Default" : p}
                  </button>
                  {p !== "" && (
                    <span className="event-dropdown-item-actions">
                      {onRename && (
                        <IconButton size="small" title="Rename preset"
                          onClick={(e) => { e.stopPropagation(); setRenamingPreset(p); setRenameValue(p); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      <IconButton size="small" title="Delete preset"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete preset "${p}" and all its items?`)) {
                            onDelete(p);
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
            {newPresetInput ? (
              <span className="event-new-input-row">
                <input
                  autoFocus
                  className="event-rename-input"
                  placeholder="Preset name…"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newPresetName.trim()) handleCreate();
                    if (e.key === "Escape") { setNewPresetInput(false); setNewPresetName(""); }
                  }}
                />
                <IconButton size="small" disabled={!newPresetName.trim()} onClick={handleCreate}>✓</IconButton>
                <IconButton size="small" onClick={() => { setNewPresetInput(false); setNewPresetName(""); }}>✕</IconButton>
              </span>
            ) : (
              <button className="event-dropdown-new-btn" onClick={() => setNewPresetInput(true)}>
                + New preset
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
