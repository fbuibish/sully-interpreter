import detectIntent from "./detectIntent";
import normalize from "./normalize";
import summarize from "./summarize";
import translate from "./translate";
import detectAction from "./detectAction";

const sendTextThrouhgPipeline = (text: string, destinationLanguage: 'en' | 'es' | 'fr') => {
  const normalized = normalize(text);
  const summary = summarize(normalized);
  const translated = translate(normalized, destinationLanguage);
  const intent = detectIntent(normalized);
  const action = detectAction(normalized);

  return {
    textToSpeech: translated,
    normalized: normalized,
    summary: summary,
    intent: intent,      
    action: action,
  };
};

export default sendTextThrouhgPipeline;