exports.preventDemoDelete = (req, res, next) => {
  if (req.user?.is_demo) {
    return res.status(403).json({ success: false, message: 'Demo users cannot delete records' });
  }
  next();
};

exports.preventDemoEdit = (req, res, next) => {
  if (req.user?.is_demo) {
    return res.status(403).json({ success: false, message: 'Demo users cannot edit records' });
  }
  next();
};

exports.preventDemoExport = (req, res, next) => {
  if (req.user?.is_demo) {
    return res.status(403).json({ success: false, message: 'Demo users cannot export data' });
  }
  next();
};

exports.preventDemoSettings = (req, res, next) => {
  if (req.user?.is_demo) {
    return res.status(403).json({ success: false, message: 'Demo users cannot change settings' });
  }
  next();
};
