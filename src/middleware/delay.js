// Simulate a network delay for every request (1 second)
function delayMiddleware(req, res, next) {
  setTimeout(next, 1000);
}

module.exports = delayMiddleware;
