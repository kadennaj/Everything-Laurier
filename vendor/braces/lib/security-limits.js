'use strict';

// Bound recursive upstream walkers using an iterative traversal first.
// The parser separately rejects excessive nesting before cleanup/stringification.
const MAX_DEPTH = 128;
const MAX_NODES = 65536;
function validateAst(ast) {
  const pending = [[ast, 0]];
  let count = 0;
  while (pending.length) {
    const [node, depth] = pending.pop();
    if (++count > MAX_NODES || depth >= MAX_DEPTH) {
      throw new SyntaxError('Brace pattern nesting or node limit exceeded');
    }
    if (node && Array.isArray(node.nodes)) {
      if (node.nodes.length + pending.length + count > MAX_NODES) {
        throw new SyntaxError('Brace pattern node limit exceeded');
      }
      for (const child of node.nodes) pending.push([child, depth + 1]);
    }
  }
}
module.exports = { MAX_DEPTH, validateAst };
