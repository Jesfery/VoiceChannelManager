/*jshint esversion: 6 */

module.exports = {
    /**
     * Utility function to get a deep property value without all the && this && that malarkey
     * 
     * @param {Object} obj the object
     * @param {String} key the deep property key
     * 
     * @return {Object} the deep property value
     */
    get: function get(obj, key) {
        return key.split(".").reduce(function(o, x) {
            return (typeof o == "undefined" || o === null) ? o : o[x];
        }, obj);
    }
};