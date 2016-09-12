/* jshint node: true */
'use strict';

var fs = require('fs');
var recast = require('recast');
var types = require('ast-types');

module.exports = {
  name: 'ember-cli-module-modifier',

  included: function() {
    if (!this.app) {

      if (typeof parentPostBuild === 'function') {
        var parentPostBuild = this.parent.postBuild;

        this.parent.postBuild = function() {
          parentPostBuild.apply(this.parent, arguments);
          this.postBuild.apply(this, arguments);
        };
      } else {
        this.parent.postBuild = this.postBuild.bind(this); 
      }
      
    }
  },

  postBuild: function(result) {
    var options = this.getOptions();

    var vendor = fs.readFileSync(result.directory + '/assets/vendor.js', 'utf8');
    var ast = recast.parse(vendor);

    var remove = options.remove.reduce(function(removeHash, module) {
      removeHash[module] = true;

      return removeHash;
    }, {});

    var rename = options.rename.reduce(function(renameHash, moduleTuple) {
      renameHash[moduleTuple.module] = moduleTuple.to;

      return renameHash;
    }, {});

    types.visit(ast, {
      visitCallExpression(path) {
        var functionName = path.node.callee.name;

        if (functionName === 'define' || functionName === 'enifed') {
          var moduleName = path.node.arguments[0].value;

          if (remove[moduleName]) {
            path.prune();
          } else if (rename[moduleName]) {
            path.node.arguments[0].value = rename[moduleName];
          }
        }

        this.traverse(path);
      }
    });

    fs.writeFileSync(result.directory + '/assets/vendor.js', recast.print(ast).code, 'utf8');
  },

  getOptions: function() {
    if (!this._options) {
      var options = this.app ? this.app.options : this.parent.options;
      this._options = normalizeOptions(options && options.moduleModifications);
    }
    return this._options;
  }
};

function normalizeOptions(options) {
  options = options || {};

  if (!options.replace) {
    options.replace = [];
  }

  if (!options.remove) {
    options.remove = [];
  }

  return options;
}