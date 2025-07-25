// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
// const prefix = "```json\n";
// const suffix = "```\n";

// async function gemineiTranslate(
//   word,
//   paragraph,
//   srcLang = "english",
//   targetLang = "arabic"
// ) {
//   if (word && word.split(" ").length > 1) {
//     const result = await model.generateContent(
//       longTextPrompt(word, paragraph, srcLang, targetLang)
//     );
//     const rawJson = await result.response.text();
//     let json = rawJson.trim().substring(prefix.length);
//     json = json.substring(0, json.length - suffix.length);
//     return JSON.parse(json);
//   } else {
//     const result = await model.generateContent(
//       basicPrompt(word, paragraph, srcLang, targetLang)
//     );
//     const rawJson = await result.response.text();
//     let json = rawJson.trim().substring(prefix.length);
//     json = json.substring(0, json.length - suffix.length);
//     return JSON.parse(json);
//   }
// }

// function longTextPrompt(word, paragraph, srcLang, targetLang) {
//   return `
//   You are a professional translator and language assistant. Your task is to analyze the given paragraph and translate a specific text portion of it from ${srcLang} into ${targetLang} based on its context in the paragraph.
//   ### Instructions:
//   1. Translate the specified portion called text into ${targetLang} based on its context in the paragraph.
//   2. Format the output in JSON format.
//   3. If the specified text does not represent valid words in ${srcLang} language, return false in the success field of the response and set a field 'error' to "can't find a proper translation"

//   ### Input:
//   - Paragraph: [${paragraph}]
//   - Text: [${word}]
//   - Source Language: ${srcLang}
//   - Target Language: ${targetLang}

//   ### Output (in JSON format):
//   {{
//     "success": true,
//     "text": "${word}",
//     "translation": "<translation in ${targetLang}>"
//   }}
//   `;
// }

// function basicPrompt(word, paragraph, srcLang, targetLang) {
//   return `
//   You are a professional translator and language assistant. Your task is to analyze the given paragraph and translate a specific word from ${srcLang} into ${targetLang} based on its context in the paragraph. Additionally, provide synonyms and a definition of the word for better understanding.

//   ### Instructions:
//   1. Translate the word into ${targetLang} based on its context in the paragraph.
//   2. Provide a max of 5 synonyms of the word in ${targetLang}.
//   3. Provide a max of 5 synonyms of the word in ${srcLang}.
//   4. Provide the definition of the word in ${srcLang}.
//   5. Provide 3 sentences containing the word as examples in ${srcLang}.
//   6. Format the output in JSON format.
//   7. If the selected word is not a valid word in ${srcLang} language, return false in the success field of the response and set a field 'error' to "can't find a proper translation".

//   ### Input:
//   - Paragraph: [${paragraph}]
//   - Word: [${word}]
//   - Source Language: ${srcLang}
//   - Target Language: ${targetLang}

//   ### Output (in JSON format):
//   {{
//     "success": true,
//     "word": "${word}",
//     "translation": "<${targetLang} translation>",
//     "synonyms_target": ["<synonym1>", "<synonym2>", "<synonym3>", "<synonym4>", "<synonym5>"],
//     "synonyms_src": ["<synonym1>", "<synonym2>", "<synonym3>", "<synonym4>", "<synonym5>"],
//     "definition": "<definition in ${srcLang}>",
//     "examples": ["<example1>", "<example2>", "<example3>"]
//   }}
//   `;
// }

// module.exports = gemineiTranslate;
const axios = require("axios");

async function translateWordExternally(
  word,
  context,
  srcLang = "english",
  targetLang = "arabic"
) {
  if (!context || context.trim() === "") {
    context = word;
  }
  try {
    const res = await axios.post(
      "https://turjumanmainfeature-production.up.railway.app/translate",
      {
        word,
        context,
        srcLang,
        targetLang,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = res.data;
    if (data.status === "Error") {
      throw new Error(`Translation failed: ${data.message}`);
    }

    const result = data.success === false && data.details ? data.details : data;

    const examplesRaw = Array.isArray(result.examples)
      ? result.examples
      : result.example_usage
        ? [result.example_usage]
        : [];

    const examples = Array.isArray(examplesRaw[0])
      ? examplesRaw[0]
      : examplesRaw;

    const translation = result.translation || result.translated_word || "";
    const definition = result.definition || "";

    if (!translation || !definition || examples.length === 0) {
      console.log("⚠️ Incomplete result:", result);
      throw new Error("Translation failed - missing fields");
    }

    return {
      original: result.word || word,
      translation,
      definition,
      examples,
      synonyms_src: result.synonyms_src || result.source_synonyms || [],
      synonyms_target: result.synonyms_target || result.target_synonyms || [],
    };
  } catch (err) {
    console.error("❌ Final catch error:", err.message);
    throw new Error("Translation failed");
  }
}

module.exports = translateWordExternally;
