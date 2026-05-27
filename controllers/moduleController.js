const Module = require('../models/Module');
const Feature = require('../models/Feature');
const Bug = require('../models/Bug');

// Modules
const getModules = async (req, res, next) => {
  try {
    const modules = await Module.find({ project: req.params.projectId, isDeleted: false });
    res.json({ success: true, modules });
  } catch (err) { next(err); }
};

const createModule = async (req, res, next) => {
  try {
    const mod = await Module.create({ ...req.body, project: req.params.projectId });
    res.status(201).json({ success: true, module: mod });
  } catch (err) { next(err); }
};

const updateModule = async (req, res, next) => {
  try {
    const mod = await Module.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, module: mod });
  } catch (err) { next(err); }
};

const deleteModule = async (req, res, next) => {
  try {
    const moduleId = req.params.id;
    // Soft-delete all features in this module
    await Feature.updateMany({ module: moduleId }, { isDeleted: true });
    // Soft-delete all bugs in this module
    await Bug.updateMany({ module: moduleId }, { isDeleted: true, deletedAt: new Date() });
    // Soft-delete the module itself
    await Module.findByIdAndUpdate(moduleId, { isDeleted: true });
    res.json({ success: true, message: 'Module and all its contents deleted' });
  } catch (err) { next(err); }
};

// Features
const getFeatures = async (req, res, next) => {
  try {
    const features = await Feature.find({ module: req.params.moduleId, isDeleted: false });
    res.json({ success: true, features });
  } catch (err) { next(err); }
};

const createFeature = async (req, res, next) => {
  try {
    const module = await Module.findById(req.params.moduleId);
    const feature = await Feature.create({ ...req.body, module: req.params.moduleId, project: module.project });
    res.status(201).json({ success: true, feature });
  } catch (err) { next(err); }
};

const updateFeature = async (req, res, next) => {
  try {
    const feature = await Feature.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, feature });
  } catch (err) { next(err); }
};

const deleteFeature = async (req, res, next) => {
  try {
    const featureId = req.params.id;
    // Soft-delete all bugs in this feature
    await Bug.updateMany({ feature: featureId }, { isDeleted: true, deletedAt: new Date() });
    // Soft-delete the feature itself
    await Feature.findByIdAndUpdate(featureId, { isDeleted: true });
    res.json({ success: true, message: 'Feature and all its bugs deleted' });
  } catch (err) { next(err); }
};

module.exports = { getModules, createModule, updateModule, deleteModule, getFeatures, createFeature, updateFeature, deleteFeature };
