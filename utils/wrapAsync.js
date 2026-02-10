module.exports = (fn) => {
    return (req, res, next) => {  // ✅ Proper 3-param signature
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
