import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import { CreateBookmarkEvent, DeleteBookmarkEvent } from "../Redux/BookmarksSlice";

// mode="select" — pick an event when bookmarking (default)
// mode="manage" — create/delete events only, no "Add Bookmark" action
const BookmarkEventDialog = ({ open, onClose, onConfirm, language, channel, mode = "select" }) => {
  const dispatch = useDispatch();
  const events = useSelector((state) => state.bookmarks.events);
  const [selected, setSelected] = useState("");
  const [newEventInput, setNewEventInput] = useState(false);
  const [newEventName, setNewEventName] = useState("");

  useEffect(() => {
    if (open) {
      setSelected("");
      setNewEventInput(false);
      setNewEventName("");
    }
  }, [open]);

  const handleCreateEvent = () => {
    const name = newEventName.trim();
    if (!name) return;
    dispatch(CreateBookmarkEvent({ channel, event: name }));
    setSelected(name);
    setNewEventInput(false);
    setNewEventName("");
  };

  const handleDeleteEvent = (ev, e) => {
    e.stopPropagation();
    if (window.confirm(`Delete event "${ev}" and all its bookmarks?`)) {
      dispatch(DeleteBookmarkEvent({ channel, language, event: ev }));
      if (selected === ev) setSelected("");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{mode === "manage" ? "Manage Events" : "Select Bookmark Event"}</DialogTitle>
      <DialogContent>
        <div className="bm-event-list">
          {["", ...events].map((ev) => (
            <div
              key={ev}
              className={`bm-event-option${selected === ev ? " selected" : ""}`}
              onClick={() => setSelected(ev)}
            >
              <span style={{ flex: 1 }}>{ev === "" ? "Default" : ev}</span>
              {ev !== "" && (
                <button
                  className="bm-event-delete-btn"
                  title="Delete event"
                  onClick={(e) => handleDeleteEvent(ev, e)}
                >×</button>
              )}
            </div>
          ))}
          {newEventInput ? (
            <div className="bm-event-new-row">
              <input
                autoFocus
                className="bm-event-input"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
                placeholder="Event name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateEvent();
                  if (e.key === "Escape") { setNewEventInput(false); setNewEventName(""); }
                }}
              />
              <Button size="small" onClick={handleCreateEvent} disabled={!newEventName.trim()}>Add</Button>
              <Button size="small" onClick={() => { setNewEventInput(false); setNewEventName(""); }}>✕</Button>
            </div>
          ) : (
            <button className="bm-event-new-btn" onClick={() => setNewEventInput(true)}>
              + New event
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
