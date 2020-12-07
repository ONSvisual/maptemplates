module.exports = function(req, res, next) {
  if (req.url.endsWith('.pbf')) {
    next();
    res.setHeader('Content-Encoding', 'gzip');
  } else {
    next();
  }
}

