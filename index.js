/**
 * Autor Eugene Demchenko <demchenkoev@gmail.com>
 * Created on 13.02.15.
 * License BSD
 */

var _ = require('lodash')

module.exports.errorParser = require('gx-error-parser').errorParser;

module.exports.successHandler = function(req, res, next, args, config) {
  var results = args.length > 0 ? args[0]: null
    , extend = args.length > 1 ? args[1]: {}
    , fields = config.fieldSetings
    , obj = {};

  obj[fields.key_version] = config.v;
  obj[fields.key_success_flag] = 1;
  obj[fields.key_results] = results;

  res.json(_.extend({}, extend, obj));
}

module.exports.errorHandler = function(req, res, next, args, config) {
  var errors = null
    , extend = args.length > 1 && typeof args[args.length-1] === 'object' ? args[args.length-1] : {}
    , fields = config.fieldSetings
    , obj = {};

  obj[fields.key_version] = config.v;
  obj[fields.key_success_flag] = 0;
  obj[fields.key_errors] = errors;

  if(config.errorDetailsEnabled) {
    obj[fields.key_error_details] = {
      stack: new Error().stack.split('\n').slice(3),
      raw: args.length === 1 ? args[0]: args
    }
  }
  obj[fields.key_results] = null;

  //Parse error

  config.errorParser.parse(args, function(err) {
    obj[fields.key_errors] = err;
    res.json(_.extend({}, extend, obj));
  }, config);
}

module.exports.express = function(config) {
  config = _.extend({
    v: '1',
    fieldSetings: {
      key_version: '_v',
      key_success_flag: '_ok',
      key_errors: '_err',
      key_results: 'results',
      key_error_details: '_errDetails',
    },
    errorDetailsEnabled: process && process.env ?  process.env.NODE_ENV === 'DEVELOPMENT' : false,
    successHandler: module.exports.successHandler,
    errorHandler: module.exports.errorHandler,
    errorParser: module.exports.errorParser
  }, config);

  return function (req, res, next) {
    res.api = {
      success: function (data, extend) {
        return config.successHandler.call(this, req, res, next, arguments, config);
      },
      error: function (err, extend) {
        return config.errorHandler.call(this, req, res, next, arguments, config);
      }
    };
    next();
  }
}