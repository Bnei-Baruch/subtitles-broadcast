import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import { CreateBookmarkPreset, DeleteBookmarkPreset } from "../Redux/BookmarksSlice";

// mode="select" — pick a preset when bookmarking (default)
// mode="manage" — create/delete presets only, no "Add Bookmark" action
const BookmarkEventDialog = ({ open, onClose, onConfirm, language, channel, mode = "select" }) => {
  const dispatch = useDispatch();
  const presets = useSelector((state) => state.bookmarks.presets);
  const [selected, setSelected] = useState("");
  const [newPresetInput, setNewPresetInput] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  useEffect(() => {
    if (open) {
      setSelected("");
      setNewPresetInput(false);
      setNewPresetName("");
    }
  }, [open]);

  const handleCreatePreset = () => {
    const name = newPresetName.trim();
    if (!name) return;
    dispatch(CreateBookmarkPreset({ channel, preset: name }));
    setSelected(name);
    setNewPresetInput(false);
    setNewPresetName("");
  };

  const handleDeletePreset = (ev, e) => {
    e.stopPropagation();
    if (window.confirm(`Delete preset "${ev}" and all its bookmarks?`)) {
      dispatch(DeleteBookmarkPreset({ channel, language, preset: ev }));
      if (selected === ev) setSelected("");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{mode === "manage" ? "Manage Presets" : "Select Bookmark Preset"}</DialogTitle>
      <DialogContent>
        <div className="bm-event-list">
          {["", ...presets].map((ev) => (
            <div
              key={ev}
              className={`bm-event-option${selected === ev ? " selected" : ""}`}
              onClick={() => setSelected(ev)}
            >
              <span style={{ flex: 1 }}>{ev === "" ? "Default" : ev}</span>
              {ev !== "" && (
                <button
                  className="bm-event-delete-btn"
                  title="Delete preset"
                  onClick={(e) => handleDeletePreset(ev, e)}
                >×</button>
              )}
            </div>
          ))}
          {newPresetInput ? (
            <div className="bm-event-new-row">
              <input
                autoFocus
                className="bm-event-input"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreatePreset();
                  if (e.key === "Escape") { setNewPresetInput(false); setNewPresetName(""); }
                }}
              />
              <Button size="small" onClick={handleCreatePreset} disabled={!newPresetName.trim()}>Add</Button>
              <Button size="small" onClick={() => { setNewPresetInput(false); setNewPresetName(""); }}>✕</Button>
            </div>
          ) : (
            <button className="bm-event-new-btn" onClick={() => setNewPresetInput(true)}>
              + New preset
            </button>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{mode === "manage" ? "Close" : "Cancel"}</Button>
        {mode === "select" && (
          <Button variant="contained" onClick={() => onConfirm(selected)}>Add Bookmark</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BookmarkEventDialog;
