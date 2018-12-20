function wrapMiddleware(middleware) {
  return function (req, res, next) {
    if (req.ws !== null && req.ws !== undefined) {
      req.wsHandled = true;
      try {
        middleware(req.ws, req, next);
      } catch (err) {
        next(err);
      }
    } else {
      next();
    }
  };
}
module.exports=wrapMiddleware;
