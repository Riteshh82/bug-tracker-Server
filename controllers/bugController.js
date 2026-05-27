const Bug = require("../models/Bug");
const ActivityLog = require("../models/Activitylog.js");
const Notification = require("../models/Notification");
const Project = require("../models/Project");
const Module = require("../models/Module");
const Feature = require("../models/Feature");
const XLSX = require("xlsx");

const getBugs = async (req, res, next) => {
  try {
    const {
      project,
      module,
      feature,
      priority,
      status,
      type,
      assignedTo,
      search,
      tags,
      sortBy = "createdAt",
      sortDir = "desc",
      page = 1,
      limit = 200,
      isDeleted,
    } = req.query;

    const query = { isDeleted: isDeleted === "true" };

    if (project) query.project = project;
    if (module) query.module = module;
    if (feature) query.feature = feature;
    if (priority) {
      const priorities = priority.split(",").map((p) => p.trim()).filter(Boolean);
      query.priority = priorities.length === 1 ? priorities[0] : { $in: priorities };
    }
    if (status) {
      const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);
      query.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }
    if (type) {
      const types = type.split(",").map((t) => t.trim()).filter(Boolean);
      query.type = types.length === 1 ? types[0] : { $in: types };
    }
    if (assignedTo) query.assignedTo = assignedTo;
    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagList.length) query.tags = { $in: tagList };
    }
    if (search)
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { bugId: { $regex: search, $options: "i" } },
      ];

    const allowedSortFields = ["createdAt", "priority", "status", "title", "type", "updatedAt"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortOrder = sortDir === "asc" ? 1 : -1;

    const total = await Bug.countDocuments(query);
    const bugs = await Bug.find(query)
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("project", "name")
      .populate("module", "name")
      .populate("feature", "name")
      .sort({ [sortField]: sortOrder })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      bugs,
    });
  } catch (err) {
    next(err);
  }
};

const createBug = async (req, res, next) => {
  try {
    const screenshots = req.files
      ? req.files.map((f) => ({
          url: `/uploads/${f.filename}`,
          filename: f.originalname,
        }))
      : [];

    let tags = req.body.tags;
    if (typeof tags === "string")
      tags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

    const bugData = {
      ...req.body,
      createdBy: req.user._id,
      screenshots,
      tags: tags || [],
    };
    const bug = await Bug.create(bugData);

    await ActivityLog.create({
      entity: "Bug",
      entityId: bug._id,
      action: "created",
      performedBy: req.user._id,
      metadata: { bugId: bug.bugId, title: bug.title },
    });

    if (
      bug.assignedTo &&
      bug.assignedTo.toString() !== req.user._id.toString()
    ) {
      await Notification.create({
        recipient: bug.assignedTo,
        sender: req.user._id,
        type: "bug_assigned",
        message: `You have been assigned bug ${bug.bugId}: ${bug.title}`,
        entityType: "Bug",
        entityId: bug._id,
      });
    }

    const populated = await Bug.findById(bug._id)
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("project", "name")
      .populate("module", "name")
      .populate("feature", "name");

    res.status(201).json({ success: true, bug: populated });
  } catch (err) {
    next(err);
  }
};

const getBug = async (req, res, next) => {
  try {
    const bug = await Bug.findById(req.params.id)
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("project", "name")
      .populate("module", "name")
      .populate("feature", "name")
      .populate("history.changedBy", "name avatar");
    if (!bug)
      return res.status(404).json({ success: false, message: "Bug not found" });
    res.json({ success: true, bug });
  } catch (err) {
    next(err);
  }
};

const updateBug = async (req, res, next) => {
  try {
    const bug = await Bug.findById(req.params.id);
    if (!bug)
      return res.status(404).json({ success: false, message: "Bug not found" });

    if (req.body.tags && typeof req.body.tags === "string") {
      req.body.tags = req.body.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }

    const trackedFields = ["status", "priority", "assignedTo", "title", "type"];
    const historyEntries = [];
    trackedFields.forEach((field) => {
      if (
        req.body[field] !== undefined &&
        String(bug[field]) !== String(req.body[field])
      ) {
        historyEntries.push({
          field,
          oldValue: bug[field],
          newValue: req.body[field],
          changedBy: req.user._id,
        });
      }
    });

    const previousStatus = bug.status;
    const createdById = bug.createdBy?.toString();

    Object.assign(bug, req.body);
    if (historyEntries.length) bug.history.push(...historyEntries);
    await bug.save();

    const changedFields = historyEntries.map((h) => h.field).join(", ");
    if (changedFields) {
      await ActivityLog.create({
        entity: "Bug",
        entityId: bug._id,
        action: "updated",
        performedBy: req.user._id,
        metadata: { fields: changedFields },
      });
    }

    if (
      req.body.status &&
      req.body.status !== previousStatus &&
      createdById &&
      createdById !== req.user._id.toString()
    ) {
      await Notification.create({
        recipient: bug.createdBy,
        sender: req.user._id,
        type: "status_changed",
        message: `Bug ${bug.bugId} status changed to ${req.body.status}`,
        entityType: "Bug",
        entityId: bug._id,
      });
    }

    const updated = await Bug.findById(bug._id)
      .populate("assignedTo", "name email avatar")
      .populate("createdBy", "name email avatar");
    res.json({ success: true, bug: updated });
  } catch (err) {
    next(err);
  }
};

const deleteBug = async (req, res, next) => {
  try {
    await Bug.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
    res.json({ success: true, message: "Bug moved to trash" });
  } catch (err) {
    next(err);
  }
};

const restoreBug = async (req, res, next) => {
  try {
    await Bug.findByIdAndUpdate(req.params.id, {
      isDeleted: false,
      deletedAt: null,
    });
    res.json({ success: true, message: "Bug restored" });
  } catch (err) {
    next(err);
  }
};

const getBugActivity = async (req, res, next) => {
  try {
    const activity = await ActivityLog.find({ entityId: req.params.id })
      .populate("performedBy", "name avatar")
      .sort({ createdAt: -1 });
    res.json({ success: true, activity });
  } catch (err) {
    next(err);
  }
};

// Download blank Excel template
const downloadTemplate = (req, res) => {
  const headers = [
    "Title", "Description", "Steps To Reproduce", "Expected Result", "Actual Result",
    "Priority", "Type", "Status", "Project Name", "Module Name", "Feature Name",
    "Tags", "Date Created",
  ];
  const exampleRow = [
    "Login button not working", "User cannot login with valid credentials",
    "1. Go to login page\n2. Enter credentials\n3. Click login",
    "User is logged in", "Page shows error 500",
    "High", "Bug", "Open", "My Project", "Authentication", "Login Flow",
    "critical, auth", "2024-01-15",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  // Column widths
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Bugs");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  res.setHeader("Content-Disposition", 'attachment; filename="bug-import-template.xlsx"');
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buf);
};

// Import bugs from Excel
const importBugs = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    const wb = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (!rows.length) return res.status(400).json({ success: false, message: "Excel file is empty" });

    // Fetch all user projects for name lookup
    const userProjects = await Project.find({
      $or: [{ owner: req.user._id }, { members: req.user._id }],
      isDeleted: false,
    });

    const results = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed, row 1 is header

      try {
        const title = String(row["Title"] || "").trim();
        if (!title) { errors.push({ row: rowNum, error: "Title is required" }); continue; }

        const projectName = String(row["Project Name"] || "").trim();
        if (!projectName) { errors.push({ row: rowNum, error: "Project Name is required" }); continue; }

        const project = userProjects.find(p => p.name.toLowerCase() === projectName.toLowerCase());
        if (!project) { errors.push({ row: rowNum, error: `Project "${projectName}" not found` }); continue; }

        // Module lookup
        let moduleId = null;
        const moduleName = String(row["Module Name"] || "").trim();
        if (moduleName) {
          const mod = await Module.findOne({ project: project._id, name: new RegExp(`^${moduleName}$`, 'i'), isDeleted: false });
          if (mod) moduleId = mod._id;
        }

        // Feature lookup
        let featureId = null;
        const featureName = String(row["Feature Name"] || "").trim();
        if (featureName && moduleId) {
          const feat = await Feature.findOne({ module: moduleId, name: new RegExp(`^${featureName}$`, 'i'), isDeleted: false });
          if (feat) featureId = feat._id;
        }

        // Parse date — use value from Excel or fallback to now
        let createdAt = new Date();
        const rawDate = row["Date Created"];
        if (rawDate) {
          const parsed = rawDate instanceof Date ? rawDate : new Date(rawDate);
          if (!isNaN(parsed.getTime())) createdAt = parsed;
        }

        // Tags
        const tagsRaw = String(row["Tags"] || "").trim();
        const tags = tagsRaw ? tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [];

        // Validate enums
        const PRIORITIES = ["Blocker", "High", "Medium", "Low"];
        const TYPES = ["Bug", "Suggestion", "Improvement"];
        const STATUSES = ["Open", "Assigned", "In Progress", "Resolved", "Closed", "Reopened"];
        const priority = PRIORITIES.includes(row["Priority"]) ? row["Priority"] : "Medium";
        const type = TYPES.includes(row["Type"]) ? row["Type"] : "Bug";
        const status = STATUSES.includes(row["Status"]) ? row["Status"] : "Open";

        // Build count for bugId
        const count = await Bug.countDocuments({});
        const bugId = `BUG-${String(count + results.length + 1).padStart(3, "0")}`;

        // Insert directly to preserve custom createdAt (bypass Mongoose timestamps)
        await Bug.collection.insertOne({
          bugId,
          title,
          description: String(row["Description"] || ""),
          stepsToReproduce: String(row["Steps To Reproduce"] || ""),
          expectedResult: String(row["Expected Result"] || ""),
          actualResult: String(row["Actual Result"] || ""),
          priority,
          type,
          status,
          project: project._id,
          module: moduleId,
          feature: featureId,
          tags,
          createdBy: req.user._id,
          assignedTo: null,
          screenshots: [],
          history: [],
          isDeleted: false,
          deletedAt: null,
          createdAt,
          updatedAt: createdAt,
        });

        results.push({ row: rowNum, bugId, title });
      } catch (rowErr) {
        errors.push({ row: rowNum, error: rowErr.message });
      }
    }

    res.json({
      success: true,
      imported: results.length,
      failed: errors.length,
      results,
      errors,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getBugs,
  createBug,
  getBug,
  updateBug,
  deleteBug,
  restoreBug,
  getBugActivity,
  importBugs,
  downloadTemplate,
};
