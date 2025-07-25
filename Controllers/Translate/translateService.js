const AppError = require("../../utils/AppError");
const TranslationCache = require("./cacheService");
const { checkGuestLimit } = require("./translationLimiter");
const catchAsync = require("express-async-handler");
const { findExistingTranslation, saveTranslation } = require("./dbService");
const translateWordExternally = require("../../utils/TranslateModel");

// Helper: Build cache key dynamically
const buildCacheKey = (tier, word, srcLang, targetLang) =>
  `${tier}cache:translation:${word}:${srcLang}:${targetLang}`;

// Helper: Validate required translation inputs 🚦
const validateTranslationInput = (word, srcLang, targetLang, next) => {
  if (!word || !srcLang || !targetLang) {
    return next(
      new AppError("Please provide word, srcLang , and targetLang 😃", 400)
    );
  }
};

// Helper: Handle translation errors from service 🚫
const handleTranslationError = (translationData, res) => {
  const fallbackMessage =
    translationData.error && translationData.error.includes("quota")
      ? "⚠️ Translation service is temporarily unavailable due to rate limits. Please try again in a minute."
      : "❌ Can't find a proper translation";

  console.error("[TRANSLATION ERROR]", translationData.error);
  return res
    .status(
      translationData.error && translationData.error.includes("quota")
        ? 503
        : 500
    )
    .json({
      success: false,
      message: fallbackMessage,
      error: translationData.error || "Unknown error occurred",
      fallback:
        translationData.error && translationData.error.includes("quota"),
      details: translationData,
    });
};

// Helper: Check if word is single word 📝
const isSingleWord = (word) => word.trim().split(/\s+/).length === 1;

// Helper: Build dictionary data 📚
const buildDictionaryData = (translationData, fallbackExamples) => ({
  definition: translationData.definition,
  examples:
    Array.isArray(translationData.examples) &&
    translationData.examples.length > 0
      ? translationData.examples
      : fallbackExamples,
  synonyms_src: translationData.synonyms_src,
  synonyms_target: translationData.synonyms_target,
});

// exports.translateAndSave = catchAsync(async (req, res, next) => {
//   let { word, context, srcLang, targetLang, isFavorite = false } = req.body;

//   validateTranslationInput(word, srcLang, targetLang, next);

//   const hotCacheKey = buildCacheKey("hot", word, srcLang, targetLang);
//   const warmCacheKey = buildCacheKey("warm", word, srcLang, targetLang);
//   const coldCacheKey = buildCacheKey("cold", word, srcLang, targetLang);
//   const cacheManager = new TranslationCache(
//     hotCacheKey,
//     warmCacheKey,
//     coldCacheKey
//   );

//   const cachedTranslation = await cacheManager.getCachedTranslation(word);
//   if (cachedTranslation) {
//     return res.status(200).json({
//       success: true,
//       data: {
//         id: cachedTranslation.id,
//         ...cachedTranslation,
//         source: cachedTranslation.source || "cache",
//       },
//     });
//   }

//   const translationData = await translateWordExternally(
//     word,
//     context,
//     srcLang,
//     targetLang
//   );

//   if (!translationData.success) {
//     return handleTranslationError(translationData, res);
//   }

//   const translation = translationData.translation;
//   const userId = req.user ? req.user.id : null;

//   const fallbackExamples = [
//     `Try using "${word}" in a sentence.`,
//     `"${word}" can have different meanings depending on context.`,
//     `Learn how to say "${word}" in different situations.`,
//   ];

//   if (!userId) {
//     const limitResult = checkGuestLimit(req, word, translation);
//     return res.status(limitResult.response.status).json(limitResult.response);
//   }

//   if (!isSingleWord(word)) {
//     return res.status(200).json({
//       success: true,
//       data: {
//         original: word,
//         translation,
//         message: "Translation completed (not saved - full sentence)",
//       },
//     });
//   }

//   const existingTranslation = await findExistingTranslation(
//     word,
//     srcLang,
//     targetLang,
//     userId
//   );

//   const dictionaryData = buildDictionaryData(translationData, fallbackExamples);

//   if (existingTranslation) {
//     return res.status(200).json({
//       success: true,
//       message: "Translation already exists",
//       data: {
//         original: word,
//         translation: existingTranslation.translation,
//         isFavorite: existingTranslation.isFavorite,
//         definition: dictionaryData.definition,
//         examples: dictionaryData.examples,
//         synonyms_src: dictionaryData.synonyms_src,
//         synonyms_target: dictionaryData.synonyms_target,
//       },
//     });
//   }

//   const savedTrans = await saveTranslation({
//     word,
//     srcLang,
//     targetLang,
//     translation,
//     userId,
//     isFavorite,
//     examples: dictionaryData.examples,
//     definition: dictionaryData.definition,
//     synonyms_src: dictionaryData.synonyms_src,
//     synonyms_target: dictionaryData.synonyms_target,
//   });

//   await cacheManager.saveToCache(word, dictionaryData, savedTrans);
//   console.log(`[CACHE MISS] Saved "${word}" → "${translation}" to cache`);

//   res.status(200).json({
//     success: true,
//     data: {
//       original: word,
//       level: savedTrans.level,
//       translation,
//       definition: dictionaryData.definition,
//       examples: dictionaryData.examples,
//       synonyms_src: dictionaryData.synonyms_src,
//       synonyms_target: dictionaryData.synonyms_target,
//       savedTranslation: savedTrans,
//     },
//   });
// });
exports.translateAndSave = catchAsync(async (req, res, next) => {
  let { word, context, srcLang, targetLang, isFavorite = false } = req.body;
  if (!context || context.trim() === "") {
    context = word;
  }

  validateTranslationInput(word, srcLang, targetLang, next);

  const hotCacheKey = buildCacheKey("hot", word, srcLang, targetLang);
  const warmCacheKey = buildCacheKey("warm", word, srcLang, targetLang);
  const coldCacheKey = buildCacheKey("cold", word, srcLang, targetLang);
  const cacheManager = new TranslationCache(
    hotCacheKey,
    warmCacheKey,
    coldCacheKey
  );

  const cachedTranslation = await cacheManager.getCachedTranslation(word);
  if (cachedTranslation) {
    const translation = cachedTranslation.translation || cachedTranslation.translated_word || "";
    const definition = cachedTranslation.definition || "";
    const examples = Array.isArray(cachedTranslation.examples) && cachedTranslation.examples.length > 0
      ? cachedTranslation.examples
      : cachedTranslation.example_usage
        ? [cachedTranslation.example_usage]
        : [];
    const synonyms_src = cachedTranslation.synonyms_src || cachedTranslation.source_synonyms || cachedTranslation.synonymsSrc || [];
    const synonyms_target = cachedTranslation.synonyms_target || cachedTranslation.target_synonyms || cachedTranslation.synonymsTarget || [];

    return res.status(200).json({
      success: true,
      data: {
        original: word,
        translation,
        definition,
        examples,
        synonyms_src,
        synonyms_target,
        isFavorite,
      },
    });
  }

  const translationData = await translateWordExternally(
    word,
    context,
    srcLang,
    targetLang
  );

  if (!translationData) {
    return res.status(500).json({
      success: false,
      message: "Translation failed (no data)",
    });
  }

  const translation = translationData.translation || translationData.translated_word || "";
  const definition = translationData.definition || "";
  const examples = Array.isArray(translationData.examples) && translationData.examples.length > 0
    ? translationData.examples
    : translationData.example_usage
      ? [translationData.example_usage]
      : [];
  const synonyms_src = translationData.synonyms_src || translationData.source_synonyms || [];
  const synonyms_target = translationData.synonyms_target || translationData.target_synonyms || [];

  const userId = req.user ? req.user.id : null;

  const fallbackExamples = [
    `Try using "${word}" in a sentence.`,
    `"${word}" can have different meanings depending on context.`,
    `Learn how to say "${word}" in different situations.`,
  ];

  if (!userId) {
    const limitResult = checkGuestLimit(req, word, translation);
    return res.status(limitResult.response.status).json(limitResult.response);
  }

  if (!isSingleWord(word)) {
    return res.status(200).json({
      success: true,
      data: {
        original: word,
        translation,
        definition,
        examples: examples.length > 0 ? examples : fallbackExamples,
        synonyms_src,
        synonyms_target,
        isFavorite,
        message: "Translation completed (not saved - full sentence)",
      },
    });
  }

  const existingTranslation = await findExistingTranslation(
    word,
    srcLang,
    targetLang,
    userId
  );

  if (existingTranslation) {
    return res.status(200).json({
      success: true,
      message: "Translation already exists",
      data: {
        original: word,
        translation: existingTranslation.translation,
        definition,
        examples,
        synonyms_src,
        synonyms_target,
        isFavorite: existingTranslation.isFavorite,
      },
    });
  }

  const savedTrans = await saveTranslation({
    word,
    srcLang,
    targetLang,
    translation,
    userId,
    isFavorite,
    examples,
    definition,
    synonyms_src,
    synonyms_target,
  });

  await cacheManager.saveToCache(
    word,
    {
      definition,
      examples,
      synonyms_src,
      synonyms_target,
    },
    savedTrans
  );

  console.log(`[CACHE MISS] Saved "${word}" → "${translation}" to cache`);

  res.status(200).json({
    success: true,
    data: {
      original: word,
      translation,
      definition,
      examples,
      synonyms_src,
      synonyms_target,
      isFavorite,
      savedTranslation: savedTrans,
    },
  });
});
