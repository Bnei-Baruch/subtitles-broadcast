import React, { useEffect, useState } from "react";
import { Slide } from "../Components/Slide";
import { useSelector } from "react-redux";
import { ST_QUESTION, broadcastLanguages, roundRobinQuestionsLanguages } from "../Utils/Const";
import { visibleSlideOrNull, useDeepMemo } from "../Utils/Common"
import { getAllQuestions, lastMessage } from "../Redux/MQTT/mqttSlice"
import isEqual from 'lodash/isEqual'; 

const QST_SWAP_TIME = 10 * 1000;  // 10s

export function ActiveSlide() {
  const [timeoutId, setTimeoutId] = useState(null);
  const [{nextIndex, activeQuestion}, setState] = useState({nextIndex: 0, activeQuestion: null});
  const [visibleQuestions, setVisibleQuestions] = useState([]);
  
  const subtitlesDisplayMode = useSelector(
    (state) => state.mqtt.subtitlesDisplayMode || "none",
  );

  const broadcastLangCode = useSelector(
    (state) => state.userSettings.userSettings.broadcast_language_code || "he",
  );

  const broadcastProgrammCode = useSelector(
    (state) =>
      state.userSettings.userSettings.broadcast_program_code ||
      "morning_lesson"
  );

  const mqttMessages = useSelector((state) => state.mqtt.mqttMessages);

  const slide = useDeepMemo(visibleSlideOrNull(lastMessage(mqttMessages, subtitlesDisplayMode, broadcastLangCode, broadcastProgrammCode)));
  const questionMessagesList = useDeepMemo(getAllQuestions(mqttMessages, broadcastProgrammCode));

  useEffect(() => {
    const availableLanguages = broadcastLanguages
      .filter((lang) => 
        broadcastLangCode === "he" ?
          // For Hebrew allow round robing several languages.
          roundRobinQuestionsLanguages.includes(lang.value) :
          // Other languages should show only their own language.
          lang.value === broadcastLangCode)
      .filter((lang) => questionMessagesList[lang.value])
      .sort((a, b) => a.order_num - b.order_num);

    const questions = availableLanguages.filter((lang) => {
      const q = questionMessagesList[lang.value];
      return q && q.visible !== false && q.slide && q.slide.trim() !== "";
    });

    if (visibleQuestions.length) {
      const newNextIndex = nextIndex % visibleQuestions.length;
      const nextLang = visibleQuestions[newNextIndex].value;
      const nextQuestion = questionMessagesList[nextLang];
      setState({nextIndex: newNextIndex, activeQuestion: nextQuestion});
    }
    if (!isEqual(visibleQuestions, questions)) {
      setVisibleQuestions(questions);
    }
  }, [broadcastLangCode, questionMessagesList, nextIndex, visibleQuestions]);

  /** Implements round-robin for quesitons. */
  useEffect(() => {
    // Stop round-robin.
    if (broadcastLangCode !== "he" || subtitlesDisplayMode !== "questions" || !visibleQuestions.length ) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
      setState({nextIndex: 0, activeQuestion: null});
      return;
    }

    if (broadcastLangCode === "he" && subtitlesDisplayMode === "questions" && visibleQuestions.length) {
      if (!activeQuestion) {
        // Start round-robin
        setTimeoutId(setTimeout(() => setTimeoutId(null), QST_SWAP_TIME));
        setState({nextIndex: 0, activeQuestion: questionMessagesList[visibleQuestions[0].value]});
        return;
      }

      if (!timeoutId) {
        // Select next question
        const followingIndex = (nextIndex + 1) % visibleQuestions.length;
        const nextLang = visibleQuestions[followingIndex].value;
        const nextQuestion = questionMessagesList[nextLang];

        setTimeoutId(setTimeout(() => setTimeoutId(null), QST_SWAP_TIME));
        setState({nextIndex: followingIndex, activeQuestion: nextQuestion});
        return;
      }
    }
  }, [
    broadcastLangCode,
    subtitlesDisplayMode,
    visibleQuestions,
    timeoutId,
    nextIndex,
    activeQuestion,
    questionMessagesList,
  ]);

  const activeSlide = visibleSlideOrNull(activeQuestion) || visibleSlideOrNull(slide);
  if (!activeSlide) {
    return null;
  }
  return (
    <Slide
      content={(activeSlide && activeSlide.slide) || ""}
      isLtr={
        (activeSlide && typeof activeSlide.isLtr === "boolean")
          ? activeSlide.isLtr
          : true
      }
      isQuestion={activeSlide?.slide && (
        activeSlide.type === ST_QUESTION || activeSlide.slide_type === ST_QUESTION)}
    />
  );
}

export default ActiveSlide;
