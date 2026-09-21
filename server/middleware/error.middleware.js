function error(err, req, res, next) {
  res.status(err.status || 500).send({
    acknowledgement: false,
    message: err.name || "InternalServerError",
    description: err.message || "Something went wrong",
  });
}

module.exports = error;
