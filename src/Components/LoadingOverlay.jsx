import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import "../Pages/PagesCSS/LoadingOverlay.css";

const LoadingOverlay = ({ loading, message = "Please wait", timeout = 7000 }) => {
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  useEffect(() => {
    if (loading) {
      const timeoutId = setTimeout(() => {
        setShowTimeoutMessage(true);
      }, timeout);

      return () => clearTimeout(timeoutId);
    } else {
      setShowTimeoutMessage(false);
    }
  }, [loading, timeout]);

  return loading ? (
    <div className="loading-overlay">
      <p className="loading-message">
        {message}
        <span className="loading-dots"></span>
      </p>
      {showTimeoutMessage && (
        <p className="loading-timeout">
          ⚠️ This is taking longer than expected...
        </p>
      )}
    </div>
  ) : null;
};

LoadingOverlay.propTypes = {
  loading: PropTypes.bool.isRequired,
  message: PropTypes.string,
  timeout: PropTypes.number,
};

export default LoadingOverlay;
