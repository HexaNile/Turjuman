const _ = require('lodash');
const APIfeatures = require("../utils/ApiFeaturs");
const catchAsync = require("express-async-handler");

// Models 📦
const savedtransModel = require("../Models/savedtransModel");

// Services & Queries 🔧
const { translateAndSave } = require("./Translate/translateService");
const { getTranslationHistory } = require("./Translate/statsService");
const { checkTranslationLimit } = require("./Translate/translationLimiter");
const { ocrTranslateImage } = require("./Translate/ocrService");
const { translateFile } = require("./Translate/fileTranslateService");
const {
  searchAndFilterTranslations,
  userTanslations,
  getFavoritesInOrder,
  markAsFavoriteById,
  unMakrFavoriteById,
  GetSingleTranslate,
} = require("./Translate/translationQueries");

// Factory functions 🏭
const factory = require("../Controllers/handerController");

// ===================== Translation Logic 📝 =====================

exports.checkTranslationLimit = checkTranslationLimit;

exports.getUserTranslation = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const features = new APIfeatures(savedtransModel.find({ userId }), req.query)
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const savedTrans = await features.mongoesquery;
  const totalCount = await features.getTotalCount();

  const translations = savedTrans.map((trans) =>
    _.pick(trans, [
      'id',
      'word',
      'translation',
      'srcLang',
      'targetLang',
      'isFavorite',
      'createdAt',
      'definition',
      'synonyms_src',
      'synonyms_target',
      'examples'
    ])
  );

  res.status(200).json({
    status: "success",
    count: translations.length,
    totalCount,
    data: translations,
  });
});

// ===================== Favorites ⭐ =====================

exports.getFavorites = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const features = new APIfeatures(
    savedtransModel.find({ userId, isFavorite: true }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .pagination();

  const favorites = await features.mongoesquery;
  const totalCount = await features.getTotalCount();

  // Format the response with detailed favorite translations using _.pick
  const favoriteTranslations = favorites.map((trans) =>
    _.pick(trans, [
      'id',
      'word',
      'translation',
      'srcLang',
      'targetLang',
      'isFavorite',
      'createdAt',
      'definition',
      'synonyms_src',
      'synonyms_target',
      'examples'
    ])
  );

  res.status(200).json({
    status: "success",
    count: favoriteTranslations.length,
    totalCount,
    data: favoriteTranslations,
  });
});

// ===================== File Translation 📁 =====================

exports.translateFile = translateFile;

// ===================== OCR Translation 📷 =====================

exports.ocrTranslateImage = ocrTranslateImage;

// ===================== Translation Queries & Utilities 🔍 =====================

exports.getFavoritesInOrder = getFavoritesInOrder;
exports.markAsFavoriteById = markAsFavoriteById;
exports.unMakrFavoriteById = unMakrFavoriteById;
exports.GetSingleTranslate = GetSingleTranslate;
exports.searchAndFilterTranslations = searchAndFilterTranslations;
exports.userTanslations = userTanslations;

// ===================== Factory Handlers 🏗 =====================

exports.deleteTranslationById = factory.deleteOne(savedtransModel);
exports.getalltranslations = factory.getAll(savedtransModel);

// ===================== Other Services 🚀 =====================

exports.translateAndSave = translateAndSave;
exports.getTranslationHistory = getTranslationHistory;
