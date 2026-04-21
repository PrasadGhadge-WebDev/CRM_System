const apiResponse = (req, res, next) => {
  res.ok = (data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  };

  res.created = (data = null, message = 'Resource created') => {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  };

  res.fail = (message = 'Error', statusCode = 500, data = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      data,
    });
  };

  next();
};

module.exports = apiResponse;
