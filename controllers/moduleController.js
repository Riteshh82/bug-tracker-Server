const Module = require('../models/Module');
const Feature = require('../models/Feature');

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
    await Module.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'Module deleted' });
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
    await Feature.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'Feature deleted' });
  } catch (err) { next(err); }
};

module.exports = { getModules, createModule, updateModule, deleteModule, getFeatures, createFeature, updateFeature, deleteFeature };
