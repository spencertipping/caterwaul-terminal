// Prerequisites.
// We need to load dependencies and the extension modules.



// Module dependencies.
// Usually this is just Caterwaul and the standard extension. If you modify these, you should probably also run 'dependencies edit' to inform the script about where these files are downloaded
// from.

// Caterwaul JS | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Introduction.
// Caterwaul is a Javascript-to-Javascript compiler. Visit http://caterwauljs.org for information about how and why you might use it.

(function (f) {return f(f)})(function (initializer, key, undefined) {

// Utility methods.
// Utility functions here are:

// | 1. qw      Splits a string into space-separated words and returns an array of the results. This is a Perl idiom that's really useful when writing lists of things.
//   2. se      Side-effects on a value and returns the value.
//   3. fail    Throws an error. This isn't particularly special except for the fact that the keyword 'throw' can't be used in expression context.
//   4. gensym  Generates a string that will never have been seen before.
//   5. bind    Fixes 'this' inside the function being bound. This is a common Javascript idiom, but is reimplemented here because we don't know which other libraries are available.
//   6. map     Maps a function over an array-like object and returns an array of the results.
//   7. rmap    Recursively maps a function over arrays.
//   8. hash    Takes a string, splits it into words, and returns a hash mapping each of those words to true. This is used to construct sets.
//   9. merge   Takes an object and one or more extensions, and copies all properties from each extension onto the object. Returns the object.

// Side-effecting is used to initialize things statefully; for example:

// | return se(function () {return 5}, function (f) {
//     f.sourceCode = 'return 5';
//   });

// Gensyms are unique identifiers that end with high-entropy noise that won't appear in the source being compiled. The general format of a gensym is name_count_suffix, where 'name' is provided by
// whoever requested the gensym (this allows gensyms to be more readable), 'count' is a base-36 number that is incremented with each gensym, and 'suffix' is a constant base-64 string containing
// 128 bits of entropy. (Since 64 possibilities is 6 bits, this means that we have 22 characters.)

    var qw = function (x) {return x.split(/\s+/)},  se = function (x, f) {return f && f.call(x, x) || x},  fail = function (m) {throw new Error(m)},

    unique = key || (function () {for (var xs = [], d = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$_', i = 21, n; i >= 0; --i) xs.push(d.charAt(Math.random() * 64 >>> 0));
                                  return xs.join('')})(),

    gensym = (function (c) {return function (name) {return [name || '', (++c).toString(36), unique].join('_')}})(0),  is_gensym = function (s) {return s.substr(s.length - 22) === unique},

      bind = function (f, t) {return function () {return f.apply(t, arguments)}},
       map = function (f, xs) {for (var i = 0, ys = [], l = xs.length; i < l; ++i) ys.push(f(xs[i], i)); return ys},
      rmap = function (f, xs) {return map(function (x) {return x instanceof Array ? rmap(f, x) : f(x)})},
      hash = function (s) {for (var i = 0, xs = qw(s), o = {}, l = xs.length; i < l; ++i) o[xs[i]] = true; return annotate_keys(o)},

// The merge() function is compromised for the sake of Internet Explorer, which contains a bug-ridden and otherwise horrible implementation of Javascript. The problem is that, due to a bug in
// hasOwnProperty and DontEnum within JScript, these two expressions are evaluated incorrectly:

// | for (var k in {toString: 5}) alert(k);        // no alert on IE
//   ({toString: 5}).hasOwnProperty('toString')    // false on IE

// To compensate, merge() manually copies toString if it is present on the extension object.

     merge = (function (o) {for (var k in o) if (o.hasOwnProperty(k)) return true})({toString: true}) ?
               // hasOwnProperty, and presumably iteration, both work, so we use the sensible implementation of merge():
               function (o) {for (var i = 1, l = arguments.length, _; i < l; ++i) if (_ = arguments[i]) for (var k in _) if (has(_, k)) o[k] = _[k]; return o} :

               // hasOwnProperty, and possibly iteration, both fail, so we hack around the problem with this gem:
               function (o) {for (var i = 1, l = arguments.length, _; i < l; ++i)
                               if (_ = arguments[i]) {for (var k in _) if (has(_, k)) o[k] = _[k];
                                                      if (_.toString && ! /\[native code\]/.test(_.toString.toString())) o.toString = _.toString} return o},

  // Optimizations.
//   The parser and lexer each assume valid input and do no validation. This is possible because any function passed in to caterwaul will already have been parsed by the Javascript interpreter;
//   syntax errors would have caused an error there. This enables a bunch of optimization opportunities in the parser, ultimately making it not in any way recursive and requiring only three
//   linear-time passes over the token stream. (An approximate figure; it actually does about 19 fractional passes, but not all nodes are reached.)

  // Also, I'm not confident that all Javascript interpreters are smart about hash indexing. Particularly, suppose a hashtable has 10 entries, the longest of whose keys is 5 characters. If we
//   throw a 2K string at it, it might very well hash that whole thing just to find that, surprise, the entry doesn't exist. That's a big performance hit if it happens very often. To prevent this
//   kind of thing, I'm keeping track of the longest string in the hashtable by using the 'annotate_keys' function. 'has()' knows how to look up the maximum length of a hashtable to verify that
//   the candidate is in it, resulting in the key lookup being only O(n) in the longest key (generally this ends up being nearly O(1), since I don't like to type long keys), and average-case O(1)
//   regardless of the length of the candidate.

  // As of Caterwaul 0.7.0 the _max_length property has been replaced by a gensym. This basically guarantees uniqueness, so the various hacks associated with working around the existence of the
//   special _max_length key are no longer necessary.

   max_length_key = gensym('hash'),
    annotate_keys = function (o)    {var max = 0; for (var k in o) own.call(o, k) && (max = k.length > max ? k.length : max); o[max_length_key] = max; return o},
              has = function (o, p) {return p != null && ! (p.length > o[max_length_key]) && own.call(o, p)},  own = Object.prototype.hasOwnProperty,

// Global caterwaul variable.
// Caterwaul creates a global symbol, caterwaul. Like jQuery, there's a mechanism to get the original one back if you don't want to replace it. You can call caterwaul.deglobalize() to return
// caterwaul and restore the global that was there when Caterwaul was loaded (might be useful in the unlikely event that someone else named their library Caterwaul). Note that deglobalize() is
// available only on the global caterwaul() function.

  calls_init       = function () {var f = function () {return f.init.apply(f, arguments)}; return f},
  original_global  = typeof caterwaul === 'undefined' ? undefined : caterwaul,

  caterwaul_global = se(calls_init(), function () {this.deglobalize = function () {caterwaul = original_global; return caterwaul_global};
                                                   merge(this, {merge: merge, map: map, rmap: rmap, gensym: gensym, is_gensym: is_gensym})}),

// Shared parser data.
// This data is used both for parsing and for serialization, so it's made available to all pieces of caterwaul.

  // Precomputed table values.
//   The lexer uses several character lookups, which I've optimized by using integer->boolean arrays. The idea is that instead of using string membership checking or a hash lookup, we use the
//   character codes and index into a numerical array. This is guaranteed to be O(1) for any sensible implementation, and is probably the fastest JS way we can do this. For space efficiency,
//   only the low 256 characters are indexed. High characters will trigger sparse arrays, which may degrade performance. Also, this parser doesn't handle Unicode characters properly; it assumes
//   lower ASCII only.

  // The lex_op table indicates which elements trigger regular expression mode. Elements that trigger this mode cause a following / to delimit a regular expression, whereas other elements would
//   cause a following / to indicate division. By the way, the operator ! must be in the table even though it is never used. The reason is that it is a substring of !==; without it, !== would
//   fail to parse.

  // Caterwaul 1.1.3 adds support for Unicode characters, even though they're technically not allowed as identifiers in Javascript. All Unicode characters are treated as identifiers since
//   Javascript assigns no semantics to them.

       lex_op = hash('. new ++ -- u++ u-- u+ u- typeof u~ u! ! * / % + - << >> >>> < > <= >= instanceof in == != === !== & ^ | && || ? = += -= *= /= %= &= |= ^= <<= >>= >>>= : , ' +
                     'return throw case var const break continue void else u; ;'),

    lex_table = function (s) {for (var i = 0, xs = [false]; i < 8; ++i) xs.push.apply(xs, xs); for (var i = 0, l = s.length; i < l; ++i) xs[s.charCodeAt(i)] = true; return xs},
    lex_float = lex_table('.0123456789'),    lex_decimal = lex_table('0123456789'),  lex_integer = lex_table('0123456789abcdefABCDEFx'),  lex_exp = lex_table('eE'),
    lex_space = lex_table(' \n\r\t'),        lex_bracket = lex_table('()[]{}'),       lex_opener = lex_table('([{'),                    lex_punct = lex_table('+-*/%&|^!~=<>?:;.,'),
      lex_eol = lex_table('\n\r'),     lex_regexp_suffix = lex_table('gims'),          lex_quote = lex_table('\'"/'),                   lex_slash = '/'.charCodeAt(0),
     lex_star = '*'.charCodeAt(0),              lex_back = '\\'.charCodeAt(0),             lex_x = 'x'.charCodeAt(0),                     lex_dot = '.'.charCodeAt(0),
     lex_zero = '0'.charCodeAt(0),     lex_postfix_unary = hash('++ --'),              lex_ident = lex_table('$_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'),

  // Parse data.
//   The lexer and parser aren't entirely separate, nor can they be considering the complexity of Javascript's grammar. The lexer ends up grouping parens and identifying block constructs such
//   as 'if', 'for', 'while', and 'with'. The parser then folds operators and ends by folding these block-level constructs.

    parse_reduce_order = map(hash, ['function', '( [ . [] ()', 'new delete', 'u++ u-- ++ -- typeof u~ u! u+ u-', '* / %', '+ -', '<< >> >>>', '< > <= >= instanceof in', '== != === !==', '&',
                                    '^', '|', '&&', '||', 'case', '?', '= += -= *= /= %= &= |= ^= <<= >>= >>>=', ':', ',', 'return throw break continue void', 'var const',
                                    'if else try catch finally for switch with while do', ';']),

parse_associates_right = hash('= += -= *= /= %= &= ^= |= <<= >>= >>>= ~ ! new typeof u+ u- -- ++ u-- u++ ? if else function try catch finally for switch case with while do'),
   parse_inverse_order = (function (xs) {for (var  o = {}, i = 0, l = xs.length; i < l; ++i) for (var k in xs[i]) has(xs[i], k) && (o[k] = i); return annotate_keys(o)})(parse_reduce_order),
   parse_index_forward = (function (rs) {for (var xs = [], i = 0, l = rs.length, _ = null; _ = rs[i], xs[i] = true, i < l; ++i)
                                           for (var k in _) if (has(_, k) && (xs[i] = xs[i] && ! has(parse_associates_right, k))) break; return xs})(parse_reduce_order),

              parse_lr = hash('[] . () * / % + - << >> >>> < > <= >= instanceof in == != === !== & ^ | && || = += -= *= /= %= &= |= ^= <<= >>= >>>= , : ;'),
   parse_r_until_block = annotate_keys({'function':2, 'if':1, 'do':1, 'catch':1, 'try':1, 'for':1, 'while':1, 'with':1, 'switch':1}),
         parse_accepts = annotate_keys({'if':'else', 'do':'while', 'catch':'finally', 'try':'catch'}),  parse_invocation = hash('[] ()'),
      parse_r_optional = hash('return throw break continue else'),              parse_r = hash('u+ u- u! u~ u++ u-- new typeof finally case var const void delete'),
           parse_block = hash('; {'),  parse_invisible = hash('i;'),            parse_l = hash('++ --'),     parse_group = annotate_keys({'(':')', '[':']', '{':'}', '?':':'}),
 parse_ambiguous_group = hash('[ ('),    parse_ternary = hash('?'),   parse_not_a_value = hash('function if for while catch void delete new typeof in instanceof'),
 parse_also_expression = hash('function'),

// Syntax data structures.
// There are two data structures used for syntax trees. At first, paren-groups are linked into doubly-linked lists, described below. These are then folded into immutable array-based specific
// nodes. At the end of folding there is only one child per paren-group.

  // Doubly-linked paren-group lists.
//   When the token stream is grouped into paren groups it has a hierarchical linked structure that conceptually has these pointers:

  // |                       +--------+
//                  +------  |  node  |  ------+
//                  |   +->  |        |  <--+  |
//           first  |   |    +--------+     |  |  last
//                  |   | parent     parent |  |
//                  V   |                   |  V
//               +--------+               +--------+
//               |  node  |   --- r -->   |  node  |  --- r ---/
//    /--- l --- |        |   <-- l ---   |        |
//               +--------+               +--------+

  // The primary operation performed on this tree, at least initially, is repeated folding. So we have a chain of linear nodes, and one by one certain nodes fold their siblings underneath them,
//   breaking the children's links and linking instead to the siblings' neighbors. For example, if we fold node (3) as a binary operator:

  // |     (1) <-> (2) <-> (3) <-> (4) <-> (5)             (1) <--> (3) <--> (5)
//         / \     / \     / \     / \     / \     -->     / \     /   \     / \
//                                                                /     \
//                                                              (2)     (4)        <- No link between children
//                                                              / \     / \           (see 'Fold nodes', below)

  // Fold nodes.
//   Once a node has been folded (e.g. (3) in the diagram above), none of its children will change and it will gain no more children. The fact that none of its children will change can be shown
//   inductively: suppose you've decided to fold the '+' in 'x + y' (here x and y are arbitrary expressions). This means that x and y are comprised of higher-precedence operators. Since there is
//   no second pass back to high-precedence operators, x and y will not change nor will they interact with one another. The fact that a folded node never gains more children arrives from the fact
//   that it is folded only once; this is by virtue of folding by index instead of by tree structure. (Though a good tree traversal algorithm also wouldn't hit the same node twice -- it's just
//   less obvious when the tree is changing.)

  // Anyway, the important thing about fold nodes is that their children don't change. This means that an array is a completely reasonable data structure to use for the children; it certainly
//   makes the structure simpler. It also means that the only new links that must be added to nodes as they are folded are links to new children (via the array), and links to the new siblings.
//   Once we have the array-form of fold nodes, we can build a query interface similar to jQuery, but designed for syntactic traversal. This will make routine operations such as macro
//   transformation and quasiquoting far simpler later on.

  // Both grouping and fold nodes are represented by the same data structure. In the case of grouping, the 'first' pointer is encoded as [0] -- that is, the first array element. It doesn't
//   contain pointers to siblings of [0]; these are still accessed by their 'l' and 'r' pointers. As the structure is folded, the number of children of each paren group should be reduced to just
//   one. At this point the remaining element's 'l' and 'r' pointers will both be null, which means that it is in hierarchical form instead of linked form.

  // After the tree has been fully generated and we have the root node, we have no further use for the parent pointers. This means that we can use subtree sharing to save memory. Once we're past
//   the fold stage, push() should be used instead of append(). append() works in a bidirectionally-linked tree context (much like the HTML DOM), whereas push() works like it does for arrays
//   (i.e. no parent pointer).

  // Syntax node functions.
//   These functions are common to various pieces of syntax nodes. Not all of them will always make sense, but the prototypes of the constructors can be modified independently later on if it
//   turns out to be an issue.

    syntax_common = caterwaul_global.syntax_common = {

    // Mutability.
//     These functions let you modify nodes in-place. They're used during syntax folding and shouldn't really be used after that (hence the underscores).

      _replace:  function (n) {return (n.l = this.l) && (this.l.r = n), (n.r = this.r) && (this.r.l = n), this},  _append_to: function (n) {return n && n._append(this), this},
      _reparent: function (n) {return this.p && this.p[0] === this && (this.p[0] = n), this},  _fold_l: function (n) {return this._append(this.l && this.l._unlink(this) || empty)},
      _append:   function (n) {return (this[this.length++] = n) && (n.p = this), this},        _fold_r: function (n) {return this._append(this.r && this.r._unlink(this) || empty)},
      _sibling:  function (n) {return n.p = this.p, (this.r = n).l = this},                    _fold_lr: function () {return this._fold_l()._fold_r()},
                                                                                               _fold_rr: function () {return this._fold_r()._fold_r()},

      _wrap:     function (n) {return n.p = this._replace(n).p, this._reparent(n), delete this.l, delete this.r, this._append_to(n)},
      _unlink:   function (n) {return this.l && (this.l.r = this.r), this.r && (this.r.l = this.l), delete this.l, delete this.r, this._reparent(n)},

    // These methods are OK for use after the syntax folding stage is over (though because syntax nodes are shared it's generally dangerous to go modifying them):

      pop: function () {return --this.length, this},  push: function (x) {return this[this.length++] = x || empty, this},

    // Identification.
//     You can request that a syntax node identify itself, in which case it will give you an identifier if it hasn't already. The identity is not determined until the first time it is requested,
//     and after that it is stable. As of Caterwaul 0.7.0 the mechanism works differently (i.e. isn't borked) in that it replaces the prototype definition with an instance-specific closure the
//     first time it gets called. This may reduce the number of decisions in the case that the node's ID has already been computed.

                       id: function () {var id = gensym('id'); return (this.id = function () {return id})()},
      is_caterwaul_syntax: true,

    // Traversal functions.
//     each() is the usual side-effecting shallow traversal that returns 'this'. map() distributes a function over a node's children and returns the array of results, also as usual. Two variants,
//     reach and rmap, perform the process recursively. reach is non-consing; it returns the original as a reference. rmap, on the other hand, follows some rules to cons a new tree. If the
//     function passed to rmap() returns the node verbatim then its children are traversed. If it returns a distinct node, however, then traversal doesn't descend into the children of the newly
//     returned tree but rather continues as if the original node had been a leaf. For example:

    // |           parent          Let's suppose that a function f() has these mappings:
//                /      \
//            node1      node2       f(parent) = parent   f(node1) = q
//            /   \        |                              f(node2) = node2
//          c1     c2      c3

    // In this example, f() would be called on parent, node1, node2, and c3 in that order. c1 and c2 are omitted because node1 was replaced by q -- and there is hardly any point in going through
//     the replaced node's previous children. (Nor is there much point in forcibly iterating over the new node's children, since presumably they are already processed.) If a mapping function
//     returns something falsy, it will have exactly the same effect as returning the node without modification.

    // Recursive map() and each() variants have another form starting with Caterwaul 1.1.3. These are pmap() and peach(), which recursively traverse the tree in post-order. That is, the node
//     itself is visited after its children are.

    // Using the old s() to do gensym-safe replacement requires that you invoke it only once, and this means that for complex macroexpansion you'll have a long array of values. This isn't ideal,
//     so syntax trees provide a replace() function that handles replacement more gracefully:

    // | qs[(foo(_foo), _before_bar + bar(_bar))].replace({_foo: qs[x], _before_bar: qs[3 + 5], _bar: qs[foo.bar]})

      each:  function (f) {for (var i = 0, l = this.length; i < l; ++i) f(this[i], i); return this},
      map:   function (f) {for (var n = new this.constructor(this), i = 0, l = this.length; i < l; ++i) n.push(f(this[i], i) || this[i]); return n},

      reach: function (f) {f(this); this.each(function (n) {n.reach(f)}); return this},
      rmap:  function (f) {var r = f(this); return ! r || r === this ? this.map(function (n) {return n.rmap(f)}) : r.rmap === undefined ? new this.constructor(r) : r},

      peach: function (f) {this.each(function (n) {n.peach(f)}); f(this); return this},
      pmap:  function (f) {var t = this.map(function (n) {return n.pmap(f)}); return f(t)},

      clone: function () {return this.rmap(function () {return false})},

      collect: function (p)  {var ns = []; this.reach(function (n) {p(n) && ns.push(n)}); return ns},
      replace: function (rs) {var r; return own.call(rs, this.data) && (r = rs[this.data]) ?
                                              r.constructor === String ? se(this.map(function (n) {return n.replace(rs)}), function () {this.data = r}) : r :
                                              this.map(function (n) {return n.replace(rs)})},

    // Alteration.
//     These functions let you make "changes" to a node by returning a modified copy.

      repopulated_with: function (xs)     {return new this.constructor(this.data, xs)},
      with_data:        function (d)      {return new this.constructor(d, Array.prototype.slice.call(this))},
      change:           function (i, x)   {return se(new this.constructor(this.data, Array.prototype.slice.call(this)), function (n) {n[i] = x})},
      compose_single:   function (i, f)   {return this.change(i, f(this[i]))},
      slice:            function (x1, x2) {return new this.constructor(this.data, Array.prototype.slice.call(this, x1, x2))},

    // General-purpose traversal.
//     This is a SAX-style traversal model, useful for analytical or scope-oriented tree traversal. You specify a callback function that is invoked in pre-post-order on the tree (you get events
//     for entering and exiting each node, including leaves). Each time a node is entered, the callback is invoked with an object of the form {entering: node}, where 'node' is the syntax node
//     being entered. Each time a node is left, the callback is invoked with an object of the form {exiting: node}. The return value of the function is not used. Any null nodes are not traversed,
//     since they would fail any standard truthiness tests for 'entering' or 'exiting'.

    // I used to have a method to perform scope-annotated traversal, but I removed it for two reasons. First, I had no use for it (and no tests, so I had no reason to believe that it worked).
//     Second, Caterwaul is too low-level to need such a method. That would be more appropriate for an analysis extension.

      traverse: function (f) {f({entering: this}); f({exiting: this.each(function (n) {n.traverse(f)})}); return this},

    // Structural transformation.
//     Having nested syntax trees can be troublesome. For example, suppose you're writing a macro that needs a comma-separated list of terms. It's a lot of work to dig through the comma nodes,
//     each of which is binary. Javascript is better suited to using a single comma node with an arbitrary number of children. (This also helps with the syntax tree API -- we can use .map() and
//     .each() much more effectively.) Any binary operator can be transformed this way, and that is exactly what the flatten() method does. (flatten() returns a new tree; it doesn't modify the
//     original.)

    // The tree flattening operation looks like this for a left-associative binary operator:

    // |        (+)
//             /   \              (+)
//          (+)     z     ->     / | \
//         /   \                x  y  z
//        x     y

    // This flatten() method returns the nodes along the chain of associativity, always from left to right. It is shallow, since generally you only need a localized flat tree. That is, it doesn't
//     descend into the nodes beyond the one specified by the flatten() call. It takes an optional parameter indicating the operator to flatten over; if the operator in the tree differs, then the
//     original node is wrapped in a unary node of the specified operator. The transformation looks like this:

    // |                                  (,)
//            (+)                          |
//           /   \   .flatten(',')  ->    (+)
//          x     y                      /   \
//                                      x     y

    // Because ',' is a binary operator, a ',' tree with just one operand will be serialized exactly as its lone operand would be. This means that plurality over a binary operator such as comma
//     or semicolon degrades gracefully for the unary case (this sentence makes more sense in the context of macro definitions; see in particular 'let' and 'where' in std.bind).

    // The unflatten() method performs the inverse transformation. It doesn't delete a converted unary operator in the tree case, but if called on a node with more than two children it will nest
//     according to associativity.

      flatten:   function (d) {d = d || this.data; return d !== this.data ? this.as(d) : ! (has(parse_lr, d) && this.length) ? this : has(parse_associates_right, d) ?
                                                     se(new this.constructor(d), bind(function (n) {for (var i = this;     i && i.data === d; i = i[1]) n.push(i[0]); n.push(i)}, this)) :
                                                     se(new this.constructor(d), bind(function (n) {for (var i = this, ns = []; i.data === d; i = i[0]) i[1] && ns.push(i[1]); ns.push(i);
                                                                                                    for (i = ns.length - 1; i >= 0; --i) n.push(ns[i])}, this))},

      unflatten: function  () {var t = this, right = has(parse_associates_right, this.data); return this.length <= 2 ? this : se(new this.constructor(this.data), function (n) {
                                 if (right) for (var i = 0, l = t.length - 1; i  < l; ++i) n = n.push(t[i]).push(i < l - 2 ? new t.constructor(t.data) : t[i])[1];
                                 else       for (var i = t.length - 1;        i >= 1; --i) n = n.push(i > 1 ? new t.constructor(t.data) : t[0]).push(t[i])[0]})},

    // Wrapping.
//     Sometimes you want your syntax tree to have a particular operator, and if it doesn't have that operator you want to wrap it in a node that does. Perhaps the most common case of this is
//     when you have a possibly-plural node representing a variable or expression -- often the case when you're dealing with argument lists -- and you want to be able to assume that it's wrapped
//     in a comma node. Calling node.as(',') will return the node if it's a comma, and will return a new comma node containing the original one if it isn't.

      as: function (d) {return this.data === d ? this : new this.constructor(d).push(this)},

    // Value construction.
//     Syntax nodes sometimes represent hard references to values instead of just syntax. (See 'References' for more information.) In order to compile a syntax tree in the right environment you
//     need a mapping of symbols to these references, which is what the bindings() method returns. (It also collects references for all descendant nodes.) It takes an optional argument to
//     populate, in case you already had a hash set aside for bindings -- though it always returns the hash.

    // A bug in Caterwaul 0.5 and earlier failed to bind falsy values. This is no longer the case; nodes which bind values should indicate that they do so by setting a binds_a_value attribute
//     (ref nodes do this on the prototype), indicating that their value should be read from the 'value' property. (This allows other uses of a 'value' property while making it unambiguous
//     whether a particular node intends to bind something.)

      bindings: function (hash) {var result = hash || {}; this.reach(function (n) {if (n.binds_a_value) result[n.data] = n.value}); return result},

    // Containment.
//     You can ask a tree whether it contains any nodes that satisfy a given predicate. This is done using the .contains() method and is significantly more efficient than using .collect() if your
//     tree does in fact contain a matching node.

      contains: function (f) {var result = f(this);
                              if (result) return result;
                              for (var i = 0, l = this.length; i < l; ++i) if (result = this[i].contains(f)) return result},

    // Matching.
//     Any syntax tree can act as a matching pattern to destructure another one. It's often much more fun to do things this way than it is to try to pick it apart by hand. For example, suppose
//     you wanted to determine whether a node represents a function that immediately returns, and to know what it returns. The simplest way to do it is like this:

    // | var tree = ...
//       var match = caterwaul.parse('function (_) {return _value}').match(tree);
//       if (match) {
//         var value = match._value;
//         ...
//       }

    // The second parameter 'variables' stores a running total of match data. You don't provide this; match() creates it for you on the toplevel invocation. The entire original tree is available
//     as a match variable called '_'; for example: t.match(u)._ === u if u matches t.

      match: function (target, variables) {target = target.constructor === String ? caterwaul_global.parse(target) : target;
                                           variables || (variables = {_: target});
                                           if (this.is_wildcard())                                          return variables[this.data] = target, variables;
                                      else if (this.length === target.length && this.data === target.data) {for (var i = 0, l = this.length; i < l; ++i)
                                                                                                              if (! this[i].match(target[i], variables)) return null;
                                                                                                            return variables}},

    // Inspection and syntactic serialization.
//     Syntax nodes can be both inspected (producing a Lisp-like structural representation) and serialized (producing valid Javascript code). In the past, stray 'r' links were serialized as block
//     comments. Now they are folded into implied semicolons by the parser, so they should never appear by the time serialization happens.

      toString:  function () {var xs = ['']; this.serialize(xs); return xs.join('')},
      structure: function () {if (this.length) return '(' + ['"' + this.data + '"'].concat(map(function (x) {return x.structure()}, this)).join(' ') + ')';
                              else             return this.data}};

  // Syntax node subclassing.
//   Caterwaul 1.1.1 generalizes the variadic syntax node model to support arbitrary subclasses. This is useful when defining syntax trees for languages other than Javascript. As of Caterwaul
//   1.1.2 this method is nondestructive with respect to the constructor and other arguments.

    caterwaul_global.syntax_subclass = function (ctor) {var extensions = Array.prototype.slice.call(arguments, 1), proxy = function () {return ctor.apply(this, arguments)};
                                                        merge.apply(this, [proxy.prototype, syntax_common].concat(extensions));
                                                        proxy.prototype.constructor = proxy;
                                                        return proxy};

  // Type detection and retrieval.
//   These methods are used to detect the literal type of a node and to extract that value if it exists. You should use the as_x methods only once you know that the node does represent an x;
//   otherwise you will get misleading results. (For example, calling as_boolean on a non-boolean will always return false.)

  // Other methods are provided to tell you higher-level things about what this node does. For example, is_contextualized_invocation() tells you whether the node represents a call that can't be
//   eta-reduced (if it were, then the 'this' binding would be lost).

  // Wildcards are used for pattern matching and are identified by beginning with an underscore. This is a very frequently-called method, so I'm using a very inexpensive numeric check rather
//   than a string comparison. The ASCII value for underscore is 95.

    var parse_hex = caterwaul_global.parse_hex       = function (digits) {for (var result = 0, i = 0, l = digits.length, d; i < l; ++i)
                                                                            result *= 16, result += (d = digits.charCodeAt(i)) <= 58 ? d - 48 : (d & 0x5f) - 55;
                                                                          return result},

      parse_octal = caterwaul_global.parse_octal     = function (digits) {for (var result = 0, i = 0, l = digits.length; i < l; ++i) result *= 8, result += digits.charCodeAt(i) - 48;
                                                                          return result},

  unescape_string = caterwaul_global.unescape_string = function (s) {for (var i = 0, c, l = s.length, result = [], is_escaped = false; i < l; ++i)
                                                                       if (is_escaped) is_escaped = false,
                                                                                       result.push((c = s.charAt(i)) === '\\' ? '\\' :
                                                                                                   c === 'n' ? '\n'     : c === 'r' ? '\r' : c === 'b' ? '\b' : c === 'f' ? '\f' :
                                                                                                   c === '0' ? '\u0000' : c === 't' ? '\t' : c === 'v' ? '\v' :
                                                                                                   c === '"' || c === '\'' ? c :
                                                                                                   c === 'x' ? String.fromCharCode(parse_hex(s.substring(i, ++i + 1))) :
                                                                                                   c === 'u' ? String.fromCharCode(parse_hex(s.substring(i, (i += 3) + 1))) :
                                                                                                               String.fromCharCode(parse_octal(s.substring(i, (i += 2) + 1))));
                                                                  else if ((c = s.charAt(i)) === '\\') is_escaped = true;
                                                                  else result.push(c);

                                                                     return result.join('')};

    caterwaul_global.javascript_tree_type_methods = {
               is_string: function () {return /['"]/.test(this.data.charAt(0))},           as_escaped_string: function () {return this.data.substr(1, this.data.length - 2)}, 
               is_number: function () {return /^-?(0x|\d|\.\d+)/.test(this.data)},                 as_number: function () {return Number(this.data)},
              is_boolean: function () {return this.data === 'true' || this.data === 'false'},     as_boolean: function () {return this.data === 'true'},
               is_regexp: function () {return /^\/./.test(this.data)},                     as_escaped_regexp: function () {return this.data.substring(1, this.data.lastIndexOf('/'))},
                is_array: function () {return this.data === '['},                        as_unescaped_string: function () {return unescape_string(this.as_escaped_string())},

             is_wildcard: function () {return this.data.charCodeAt(0) === 95},
           is_identifier: function () {return this.length === 0 && /^[A-Za-z_$]\w*$/.test(this.data) && ! this.is_boolean() && ! this.is_null_or_undefined() && ! has(lex_op, this.data)},

       has_grouped_block: function () {return has(parse_r_until_block, this.data)},                 is_block: function () {return has(parse_block, this.data)},
    is_blockless_keyword: function () {return has(parse_r_optional, this.data)},        is_null_or_undefined: function () {return this.data === 'null' || this.data === 'undefined'},

             is_constant: function () {return this.is_number() || this.is_string() || this.is_boolean() || this.is_regexp() || this.is_null_or_undefined()},
          left_is_lvalue: function () {return /=$/.test(this.data) || /\+\+$/.test(this.data) || /--$/.test(this.data)},

                is_empty: function () {return !this.length},                              has_parameter_list: function () {return this.data === 'function' || this.data === 'catch'},
         has_lvalue_list: function () {return this.data === 'var' || this.data === 'const'},  is_dereference: function () {return this.data === '.' || this.data === '[]'},
           is_invocation: function () {return this.data === '()'},              is_contextualized_invocation: function () {return this.is_invocation() && this[0].is_dereference()},

            is_invisible: function () {return has(parse_invisible, this.data)},           is_binary_operator: function () {return has(parse_lr, this.data)},
is_prefix_unary_operator: function () {return has(parse_r, this.data)},            is_postfix_unary_operator: function () {return has(parse_l,  this.data)},
       is_unary_operator: function () {return this.is_prefix_unary_operator() || this.is_postfix_unary_operator()},

                 accepts: function (e) {return has(parse_accepts, this.data) && parse_accepts[this.data] === (e.data || e)}};

  // Javascript-specific serialization.
//   These methods are specific to the Javascript language. Other languages will have different serialization logic.

    caterwaul_global.javascript_tree_serialization_methods = {

    // Block detection.
//     Block detection is required for multi-level if/else statements. Consider this code:

    // | if (foo) for (...) {}
//       else bif;

    // A naive approach (the one I was using before version 0.6) would miss the fact that the 'for' was trailed by a block, and insert a spurious semicolon, which would break compilation:

    // | if (foo) for (...) {};    // <- note!
//       else bif;

    // What we do instead is dig through the tree and find out whether the last thing in the 'if' case ends with a block. If so, then no semicolon is inserted; otherwise we insert one. This
//     algorithm makes serialization technically O(n^2), but nobody nests if/else blocks to such an extent that it would matter.

      ends_with_block: function () {var block = this[parse_r_until_block[this.data]];
                                    return this.data === '{' || has(parse_r_until_block, this.data) && (this.data !== 'function' || this.length === 3) && block && block.ends_with_block()},

    // There's a hack here for single-statement if-else statements. (See 'Grab-until-block behavior' in the parsing code below.) Basically, for various reasons the syntax tree won't munch the
//     semicolon and connect it to the expression, so we insert one automatically whenever the second node in an if, else, while, etc. isn't a block.

    // Update for Caterwaul 0.6.6: I had removed mandatory spacing for unary prefix operators, but now it's back. The reason is to help out the host Javascript lexer, which can misinterpret
//     postfix increment/decrement: x + +y will be serialized as x++y, which is invalid Javascript. The fix is to introduce a space in front of the second plus: x+ +y, which is unambiguous.

    // Update for caterwaul 1.0: The serialize() method is now aggressively optimized for common cases. It also uses a flattened array-based concatenation strategy rather than the deeply nested
//     approach from before.

    // Optimized serialization cases.
//     We can tell a lot about how to serialize a node based on just a few properties. For example, if the node has zero length then its serialization is simply its data. This is the leaf case,
//     which is likely to be half of the total number of nodes in the whole syntax tree. If a node has length 1, then we assume a prefix operator unless we identify it as postfix. Otherwise we
//     break it down by the kind of operator that it is.

    // Nodes might be flattened, so we can't assume any upper bound on the arity regardless of what kind of operator it is. Realistically you shouldn't hand flattened nodes over to the compile()
//     function, but it isn't the end of the world if you do.

      serialize: function (xs) {var l = this.length, d = this.data, semi = ';\n',
                                 push = function (x) {if (lex_ident[xs[xs.length - 1].charCodeAt(0)] === lex_ident[x.charCodeAt(0)]) xs.push(' ', x);
                                                      else                                                                           xs.push(x)};

                                switch (l) {case 0: if (has(parse_r_optional, d)) return push(d.replace(/^u/, ''));
                                               else if (has(parse_group, d))      return push(d), push(parse_group[d]);
                                               else                               return push(d);

                                            case 1: if (has(parse_r, d) || has(parse_r_optional, d)) return push(d.replace(/^u/, '')), this[0].serialize(xs);
                                               else if (has(parse_group, d))                         return push(d), this[0].serialize(xs), push(parse_group[d]);
                                               else if (has(parse_lr, d))                            return push('/* unary ' + d + ' node */'), this[0].serialize(xs);
                                               else                                                  return this[0].serialize(xs), push(d);

                                            case 2: if (has(parse_invocation, d))    return this[0].serialize(xs), push(d.charAt(0)), this[1].serialize(xs), push(d.charAt(1));
                                               else if (has(parse_r_until_block, d)) return push(d), this[0].serialize(xs), this[1].serialize(xs);
                                               else if (has(parse_invisible, d))     return this[0].serialize(xs), this[1].serialize(xs);
                                               else if (d === ';')                   return this[0].serialize(xs), push(semi), this[1].serialize(xs);
                                               else                                  return this[0].serialize(xs), push(d), this[1].serialize(xs);

                                           default: if (has(parse_ternary, d))       return this[0].serialize(xs), push(d), this[1].serialize(xs), push(':'), this[2].serialize(xs);
                                               else if (has(parse_r_until_block, d)) return this.accepts(this[2]) && ! this[1].ends_with_block() ?
                                                                                       (push(d), this[0].serialize(xs), this[1].serialize(xs), push(semi), this[2].serialize(xs)) :
                                                                                       (push(d), this[0].serialize(xs), this[1].serialize(xs), this[2].serialize(xs));
                                               else                                  return this.unflatten().serialize(xs)}}};

  // References.
//   You can drop references into code that you're compiling. This is basically variable closure, but a bit more fun. For example:

  // | caterwaul.compile(qs[function () {return _ + 1}].replace({_: caterwaul.ref(3)}))()    // -> 4

  // What actually happens is that caterwaul.compile runs through the code replacing refs with gensyms, and the function is evaluated in a scope where those gensyms are bound to the values they
//   represent. This gives you the ability to use a ref even as an lvalue, since it's really just a variable. References are always leaves on the syntax tree, so the prototype has a length of 0.

  // Caterwaul 1.0 adds named gensyms, and one of the things you can do is name your refs accordingly. If you don't name one it will just be called 'ref', but you can make it more descriptive by
//   passing in a second constructor argument. This name will automatically be wrapped in a gensym, but that gensym will be removed at compile-time unless you specify not to rename gensyms.

    caterwaul_global.ref = caterwaul_global.syntax_subclass(
                             function (value, name) {if (value instanceof this.constructor) this.value = value.value, this.data = value.data;
                                                     else                                   this.value = value,       this.data = gensym(name && name.constructor === String ? name : 'ref')},

                             caterwaul_global.javascript_tree_type_methods,
                             caterwaul_global.javascript_tree_serialization_methods,

                             {binds_a_value: true, length: 0},

  // Reference replace() support.
//   Refs aren't normal nodes; in particular, invoking the constructor as we do in replace() will lose the ref's value and cause all kinds of problems. In order to avoid this we override the
//   replace() method for syntax refs to behave more sensibly. Note that you can't replace a ref with a syntax 

                             {replace: function (replacements) {var r; return own.call(replacements, this.data) && (r = replacements[this.data]) ?
                                                                                r.constructor === String ? se(new this.constructor(this.value), function () {this.data = r}) : r :
                                                                                this}});

  // Syntax node constructor.
//   Here's where we combine all of the pieces above into a single function with a large prototype. Note that the 'data' property is converted from a variety of types; so far we support strings,
//   numbers, and booleans. Any of these can be added as children. Also, I'm using an instanceof check rather than (.constructor ===) to allow array subclasses such as Caterwaul finite sequences
//   to be used.

    caterwaul_global.syntax = caterwaul_global.syntax_subclass(
                                function (data) {if (data instanceof this.constructor) this.data = data.data, this.length = 0;
                                                 else {this.data = data && data.toString(); this.length = 0;
                                                   for (var i = 1, l = arguments.length, _; _ = arguments[i], i < l; ++i)
                                                     for (var j = 0, lj = _.length, it, c; _ instanceof Array ? (it = _[j], j < lj) : (it = _, ! j); ++j)
                                                       this._append((c = it.constructor) === String || c === Number || c === Boolean ? new this.constructor(it) : it)}},

                                caterwaul_global.javascript_tree_type_methods,
                                caterwaul_global.javascript_tree_serialization_methods);

    var empty = caterwaul_global.empty = new caterwaul_global.syntax('');

// Parsing.
// There are two distinct parts to parsing Javascript. One is parsing the irregular statement-mode expressions such as 'if (condition) {...}' and 'function f(x) {...}'; the other is parsing
// expression-mode stuff like arithmetic operators. In Rebase I tried to model everything as an expression, but that failed sometimes because it required that each operator have fixed arity. In
// particular this was infeasible for keywords such as 'break', 'continue', 'return', and some others (any of these can be nullary or unary). It also involved creating a bizarre hack for 'case
// x:' inside a switch block. This hack made the expression passed in to 'case' unavailable, as it would be buried in a ':' node.

// Caterwaul fixes these problems by using a proper context-free grammar. However, it's much looser than most grammars because it doesn't need to validate anything. Correspondingly, it can be
// much faster as well. Instead of guessing and backtracking as a recursive-descent parser would, it classifies many different branches into the same basic structure and fills in the blanks. One
// example of this is the () {} pair, which occurs in a bunch of different constructs, including function () {}, if () {}, for () {}, etc. In fact, any time a () group is followed by a {} group
// we can grab the token that precedes () (along with perhaps one more in the case of function f () {}), and group that under whichever keyword is responsible.

  // Syntax folding.
//   The first thing to happen is that parenthetical, square bracket, and braced groups are folded up. This happens in a single pass that is linear in the number of tokens, and other foldable
//   tokens (including unary and binary operators) are indexed by associativity. The following pass runs through these indexes from high to low precedence and folds tokens into trees. By this
//   point all of the parentheticals have been replaced by proper nodes (here I include ?: groups in parentheticals, since they behave the same way). Finally, high-level rules are applied to the
//   remaining keywords, which are bound last. This forms a complete parse tree.

  // Doing all of this efficiently requires a linked list rather than an array. This gets built during the initial paren grouping stage. Arrays are used for the indexes, which are left-to-right
//   and are later processed in the order indicated by the operator associativity. That is, left-associative operators are processed 0 .. n and right associative are processed n .. 0. Keywords
//   are categorized by behavior and folded after all of the other operators. Semicolons are folded last, from left to right.

  // There are some corner cases due to Javascript's questionable heritage from C-style syntax. For example, most constructs take either syntax blocks or semicolon-delimited statements. Ideally,
//   else, while, and catch are associated with their containing if, do, and try blocks, respectively. This can be done easily, as the syntax is folded right-to-left. Another corner case would
//   come up if there were any binary operators with equal precedence and different associativity. Javascript doesn't have them however, and it wouldn't make much sense to; it would render
//   expressions such as 'a op1 b op2 c' ambiguous if op1 and op2 shared precedence but each wanted to bind first. (I mention this because at first I was worried about it, but now I realize it
//   isn't an issue.)

  // Notationally (for easier processing later on), a distinction is made between invocation and grouping, and between dereferencing and array literals. Dereferencing and function invocation are
//   placed into their own operators, where the left-hand side is the thing being invoked or dereferenced and the right-hand side is the paren-group or bracket-group that is responsible for the
//   operation. Also, commas inside these groups are flattened into a single variadic (possibly nullary) comma node so that you don't have to worry about the tree structure. This is the case for
//   all left-associative operators; right-associative operators preserve their hierarchical folding.

  // Parse/lex shared logic.
//   Lexing Javascript is not entirely straightforward, primarily because of regular expression literals. The first implementation of the lexer got things right 99% of the time by inferring the
//   role of a / by its preceding token. The problem comes in when you have a case like this:

  // | if (condition) /foo/.test(x)

  // In this case, (condition) will be incorrectly inferred to be a regular expression (since the close-paren terminates an expression, usually), and /foo/ will be interpreted as division by foo. 

  // We mark the position before a token and then just increment the position. The token, then, can be retrieved by taking a substring from the mark to the position. This eliminates the need for
//   intermediate concatenations. In a couple of cases I've gone ahead and done them anyway -- these are for operators, where we grab the longest contiguous substring that is defined. I'm not too
//   worried about the O(n^2) complexity due to concatenation; they're bounded by four characters.

  // OK, so why use charAt() instead of regular expressions? It's a matter of asymptotic performance. V8 implements great regular expressions (O(1) in the match length for the (.*)$ pattern), but
//   the substring() method is O(n) in the number of characters returned. Firefox implements O(1) substring() but O(n) regular expression matching. Since there are O(n) tokens per document of n
//   characters, any O(n) step makes lexing quadratic. So I have to use the only reliably constant-time method provided by strings, charAt() (or in this case, charCodeAt()).

  // Of course, building strings via concatenation is also O(n^2), so I also avoid that for any strings that could be long. This is achieved by using a mark to indicate where the substring
//   begins, and advancing i independently. The span between mark and i is the substring that will be selected, and since each substring both requires O(n) time and consumes n characters, the
//   lexer as a whole is O(n). (Though perhaps with a large constant.)

  // Parse function.
//   As mentioned earlier, the parser and lexer aren't distinct. The lexer does most of the heavy lifting; it matches parens and brackets, arranges tokens into a hierarchical linked list, and
//   provides an index of those tokens by their fold order. It does all of this by streaming tokens into a micro-parser whose language is grouping and that knows about the oddities required to
//   handle regular expression cases. In the same function, though as a distinct case, the operators are folded and the syntax is compiled into a coherent tree form.

  // The input to the parse function can be anything whose toString() produces valid Javascript code.

    caterwaul_global.parse = function (input) {

      // Caterwaul 1.1 revision: Allow the parse() function to be used as a 'make sure this thing is a syntax node' function.
      if (input.constructor === caterwaul_global.syntax) return input;

    // Lex variables.
//     s, obviously, is the string being lexed. mark indicates the position of the stream, while i is used for lookahead. The difference is later read into a token and pushed onto the result. c
//     is a temporary value used to store the current character code. re is true iff a slash would begin a regular expression. esc is a flag indicating whether the next character in a string or
//     regular expression literal is escaped. exp indicates whether we've seen the exponent marker in a number. close is used for parsing single and double quoted strings; it contains the
//     character code of the closing quotation mark. t is the token to be processed.

    // Parse variables.
//     grouping_stack and gs_top are used for paren/brace/etc. matching. head and parent mark two locations in the linked syntax tree; when a new group is created, parent points to the opener
//     (i.e. (, [, ?, or {), while head points to the most recently added child. (Hence the somewhat complex logic in push().) indexes[] determines reduction order, and contains references to the
//     nodes in the order in which they should be folded. invocation_nodes is an index of the nodes that will later need to be flattened.

    // The push() function manages the mechanics of adding a node to the initial linked structure. There are a few cases here; one is when we've just created a paren group and have no 'head'
//     node; in this case we append the node as 'head'. Another case is when 'head' exists; in that case we update head to be the new node, which gets added as a sibling of the old head.

        var s = input.toString(), mark = 0, c = 0, re = true, esc = false, dot = false, exp = false, close = 0, t = '', i = 0, l = s.length, cs = function (i) {return s.charCodeAt(i)},
            grouping_stack = [], gs_top = null, head = null, parent = null, indexes = map(function () {return []}, parse_reduce_order), invocation_nodes = [], all_nodes = [empty],
            new_node = function (n) {return all_nodes.push(n), n}, push = function (n) {return head ? head._sibling(head = n) : (head = n._append_to(parent)), new_node(n)},
            syntax_node = this.syntax;

    // Trivial case.
//     The empty string will break the lexer because we won't generate a token (since we're already at the end). To prevent this we return an empty syntax node immediately, since this is an
//     accurate representation of no input.

        if (l === 0) return empty;

    // Main lex loop.
//     This loop takes care of reading all of the tokens in the input stream. At the end, we'll have a linked node structure with paren groups. At the beginning, we set the mark to the current
//     position (we'll be incrementing i as we read characters), munch whitespace, and reset flags.

        while ((mark = i) < l) {
          while (lex_space[c = cs(i)] && i < l) mark = ++i;
          esc = exp = dot = t = false;

      // Miscellaneous lexing.
//       This includes bracket resetting (the top case, where an open-bracket of any sort triggers regexp mode) and comment removal. Both line and block comments are removed by comparing against
//       lex_slash, which represents /, and lex_star, which represents *.

            if                                        (lex_bracket[c])                                                                    {t = !! ++i; re = lex_opener[c]}
       else if (c === lex_slash && cs(i + 1) === lex_star && (i += 2)) {while (++i < l && cs(i) !== lex_slash || cs(i - 1) !== lex_star);  t = !  ++i}
       else if            (c === lex_slash && cs(i + 1) === lex_slash) {while                              (++i < l && ! lex_eol[cs(i)]);  t = false}

      // Regexp and string literal lexing.
//       These both take more or less the same form. The idea is that we have an opening delimiter, which can be ", ', or /; and we look for a closing delimiter that follows. It is syntactically
//       illegal for a string to occur anywhere that a slash would indicate division (and it is also illegal to follow a string literal with extra characters), so reusing the regular expression
//       logic for strings is not a problem. (This follows because we know ahead of time that the Javascript is valid.)

       else if (lex_quote[c] && (close = c) && re && ! (re = ! (t = s.charAt(i)))) {while (++i < l && (c = cs(i)) !== close || esc)  esc = ! esc && c === lex_back;
                                                                                    while     (++i < l && lex_regexp_suffix[cs(i)])                               ; t = true}

      // Numeric literal lexing.
//       This is far more complex than the above cases. Numbers have several different formats, each of which requires some custom logic. The reason we need to parse numbers so exactly is that it
//       influences how the rest of the stream is lexed. One example is '0.5.toString()', which is perfectly valid Javascript. What must be output here, though, is '0.5', '.', 'toString', '(',
//       ')'; so we have to keep track of the fact that we've seen one dot and stop lexing the number on the second.

      // Another case is exponent-notation: 3.0e10. The hard part here is that it's legal to put a + or - on the exponent, which normally terminates a number. Luckily we can safely skip over any
//       character that comes directly after an E or e (so long as we're really in exponent mode, which I'll get to momentarily), since there must be at least one digit after an exponent.

      // The final case, which restricts the logic somewhat, is hexadecimal numbers. These also contain the characters 'e' and 'E', but we cannot safely skip over the following character, and any
//       decimal point terminates the number (since '0x5.toString()' is also valid Javascript). The same follows for octal numbers; the leading zero indicates that there will be no decimal point,
//       which changes the lex mode (for example, '0644.toString()' is valid).

      // So, all this said, there are different logic branches here. One handles guaranteed integer cases such as hex/octal, and the other handles regular numbers. The first branch is triggered
//       whenever a number starts with zero and is followed by 'x' or a digit (for conciseness I call 'x' a digit), and the second case is triggered when '.' is followed by a digit, or when a
//       digit starts.

      // A trivial change, using regular expressions, would reduce this logic significantly. I chose to write it out longhand because (1) it's more fun that way, and (2) the regular expression
//       approach has theoretically quadratic time in the length of the numbers, whereas this approach keeps things linear. Whether or not that actually makes a difference I have no idea.

      // Finally, in response to a recently discovered failure case, a period must be followed by a digit if it starts a number. The failure is the string '.end', which will be lexed as '.en',
//       'd' if it is assumed to be a floating-point number. (In fact, any method or property beginning with 'e' will cause this problem.)

       else if                  (c === lex_zero && lex_integer[cs(i + 1)]) {while (++i < l && lex_integer[cs(i)]); re = ! (t = true)}
       else if (lex_float[c] && (c !== lex_dot || lex_decimal[cs(i + 1)])) {while (++i < l && (lex_decimal[c = cs(i)] || (dot ^ (dot |= c === lex_dot)) || (exp ^ (exp |= lex_exp[c] && ++i))));
                                                                            while (i < l && lex_decimal[cs(i)]) ++i; re = ! (t = true)}

      // Operator lexing.
//       The 're' flag is reused here. Some operators have both unary and binary modes, and as a heuristic (which happens to be accurate) we can assume that anytime we expect a regular
//       expression, a unary operator is intended. The only exception are ++ and --, which are always unary but sometimes are prefix and other times are postfix. If re is true, then the prefix
//       form is intended; otherwise, it is postfix. For this reason I've listed both '++' and 'u++' (same for --) in the operator tables; the lexer is actually doing more than its job here by
//       identifying the variants of these operators.

      // The only exception to the regular logic happens if the operator is postfix-unary. (e.g. ++, --.) If so, then the re flag must remain false, since expressions like 'x++ / 4' can be valid.

       else if (lex_punct[c] && (t = re ? 'u' : '', re = true)) {while (i < l && lex_punct[cs(i)] && has(lex_op, t + s.charAt(i)))  t += s.charAt(i++); re = ! has(lex_postfix_unary, t)}

      // Identifier lexing.
//       If nothing else matches, then the token is lexed as a regular identifier or Javascript keyword. The 're' flag is set depending on whether the keyword expects a value. The nuance here is
//       that you could write 'x / 5', and it is obvious that the / means division. But if you wrote 'return / 5', the / would be a regexp delimiter because return is an operator, not a value. So
//       at the very end, in addition to assigning t, we also set the re flag if the word turns out to be an operator.

      // Extended ASCII and above are considered identifiers. This allows Caterwaul to parse Unicode source, even though it will fail to distinguish between Unicode operator symbols and Unicode
//       letters.

       else {while (++i < l && (lex_ident[c = cs(i)] || c > 0x7f)); re = has(lex_op, t = s.substring(mark, i))}

      // Token unification.
//       t will contain true, false, or a string. If false, no token was lexed; this happens when we read a comment, for example. If true, the substring method should be used. (It's a shorthand to
//       avoid duplicated logic.) For reasons that are not entirely intuitive, the lexer sometimes produces the artifact 'u;'. This is never useful, so I have a case dedicated to removing it.

        if (i === mark) throw new Error('Caterwaul lex error at "' + s.substr(mark, 40) + '" with leading context "' + s.substr(mark - 40, 40) + '" (probably a Caterwaul bug)');
        if (t === false) continue;
        t = t === true ? s.substring(mark, i) : t === 'u;' ? ';' : t;

      // Grouping and operator indexing.
//       Now that we have a token, we need to see whether it affects grouping status. There are a couple of possibilities. If it's an opener, then we create a new group; if it's a matching closer
//       then we close the current group and pop out one layer. (We don't check for matching here. Any code provided to Caterwaul will already have been parsed by the host Javascript interpreter,
//       so we know that it is valid.)

      // All operator indexing is done uniformly, left-to-right. Note that the indexing isn't strictly by operator. It's by reduction order, which is arguably more important. That's what the
//       parse_inverse_order table does: it maps operator names to parse_reduce_order subscripts. (e.g. 'new' -> 2.)

        t === gs_top ? (grouping_stack.pop(), gs_top = grouping_stack[grouping_stack.length - 1], head = head ? head.p : parent, parent = null) :
                       (has(parse_group, t) ? (grouping_stack.push(gs_top = parse_group[t]), parent = push(new_node(new syntax_node(t))), head = null) : push(new_node(new syntax_node(t))),
                        has(parse_inverse_order, t) && indexes[parse_inverse_order[t]].push(head || parent));           // <- This is where the indexing happens

      // Regexp flag special cases.
//       Normally a () group wraps an expression, so a following / would indicate division. The only exception to this is when we have a block construct; in this case, the next token appears in
//       statement-mode, which means that it begins, not modifies, a value. We'll know that we have such a case if (1) the immediately-preceding token is a close-paren, and (2) a block-accepting
//       syntactic form occurs to its left.

      // With all this trouble over regular expressions, I had to wonder whether it was possible to do it more cleanly. I don't think it is, unfortunately. Even lexing the stream backwards fails
//       to resolve the ambiguity:

      // | for (var k in foo) /foo/g.test(k) && bar();

      // In this case we won't know it's a regexp until we hit the 'for' keyword (or perhaps 'var', if we're being clever -- but a 'with' or 'if' would require complete lookahead). A perfectly
//       valid alternative parse, minus the 'for' and 'var', is this:

      // | ((k in foo) / (foo) / (g.test(k))) && bar();

      // The only case where reverse-lexing is useful is when the regexp has no modifiers.

        re |= t === ')' && head.l && has(parse_r_until_block, head.l.data)}

    // Operator fold loop.
//     This is the second major part of the parser. Now that we've completed the lex process, we can fold operators and syntax, and take care of some exception cases.

    // First step: functions, calls, dots, and dereferences.
//     I'm treating this differently from the generalized operator folding because of the syntactic inference required for call and dereference detection. Nothing has been folded at this point
//     (with the exception of paren groups, which is appropriate), so if the node to the left of any ( or [ group is an operator, then the ( or [ is really a paren group or array literal. If, on
//     the other hand, it is another value, then the group is a function call or a dereference. This folding goes left-to-right. The reason we also process dot operators is that they share the same
//     precedence as calls and dereferences. Here's what a () or [] transform looks like:

    // |   quux <--> foo <--> ( <--> bar                              quux <--> () <--> bar
//                             \                                               /  \                  <-- This can be done by saying _.l.wrap(new node('()')).p.fold_r().
//                              bif <--> , <--> baz       -->               foo    (                     _.l.wrap() returns l again, .p gets the wrapping node, and fold_r adds a child to it.
//                                                                                  \
//                                                                                   bif <--> , <--> baz

    // This is actually merged into the for loop below, even though it happens before other steps do (see 'Ambiguous parse groups').

    // Second step: fold operators.
//     Now we can go through the list of operators, folding each according to precedence and associativity. Highest to lowest precedence here, which is just going forwards through the indexes[]
//     array. The parse_index_forward[] array indicates which indexes should be run left-to-right and which should go right-to-left.

        for (var i = 0, l = indexes.length, forward, _; _ = indexes[i], forward = parse_index_forward[i], i < l; ++i)
          for (var j = forward ? 0 : _.length - 1, lj = _.length, inc = forward ? 1 : -1, node, data, ll; forward ? j < lj : j >= 0; j += inc)

      // Binary node behavior.
//       The most common behavior is binary binding. This is the usual case for operators such as '+' or ',' -- they grab one or both of their immediate siblings regardless of what they are.
//       Operators in this class are considered to be 'fold_lr'; that is, they fold first their left sibling, then their right.

            if (has(parse_lr, data = (node = _[j]).data))  node._fold_lr();

      // Ambiguous parse groups.
//       As mentioned above, we need to determine whether grouping constructs are invocations or real groups. This happens to take place before other operators are parsed (which is good -- that way
//       it reflects the precedence of dereferencing and invocation). The only change we need to make is to discard the explicit parenthetical or square-bracket grouping for invocations or
//       dereferences, respectively. It doesn't make much sense to have a doubly-nested structure, where we have a node for invocation and another for the group on the right-hand side of that
//       invocation. Better is to modify the group in-place to represent an invocation.

      // We can't solve this problem here, but we can solve it after the parse has finished. I'm pushing these invocation nodes onto an index for the end.

      // Sometimes we have a paren group that doesn't represent a value. This is the case for most control flow constructs:

      // | for (var k in o) (...)

      // We need to detect this and not fold the (var k in o)(...) as an invocation, since doing so would seriously break the resulting syntax.

      // There is an even more pathological case to consider. Firefox and other SpiderMonkey-based runtimes rewrite anonymous functions without parentheses, so you end up with stuff like this:

      // | function () {} ()

      // In this case we need to encode an invocation. Fortunately by this point the function node is already folded.

       else if (has(parse_ambiguous_group, data) && node.l && ! ((ll = node.l.l) && has(parse_r_until_block, ll.data)) &&
               (node.l.data === '.' || (node.l.data === 'function' && node.l.length === 2) ||
                                       ! (has(lex_op, node.l.data) ||
                                          has(parse_not_a_value, node.l.data))))  invocation_nodes.push(node.l._wrap(new_node(new syntax_node(data + parse_group[data]))).p._fold_r());

      // Unary left and right-fold behavior.
//       Unary nodes have different fold directions. In this case, it just determines which side we grab the node from. I'm glad that Javascript doesn't allow stuff like '++x++', which would make
//       the logic here actually matter. Because there isn't that pathological case, exact rigidity isn't required.

       else if (has(parse_l, data))  node._fold_l();
       else if (has(parse_r, data))  node._fold_r();

      // Ternary operator behavior.
//       This is kind of interesting. If we have a ternary operator, then it will be treated first as a group; just like parentheses, for example. This is the case because the ternary syntax is
//       unambiguous for things in the middle. So, for example, '3 ? 4 : 5' initially parses out as a '?' node whose child is '4'. Its siblings are '3' and '5', so folding left and right is an
//       obvious requirement. The only problem is that the children will be in the wrong order. Instead of (3) (4) (5), we'll have (4) (3) (5). So after folding, we do a quick swap of the first two
//       to set the ordering straight.

       else if (has(parse_ternary, data))  {node._fold_lr(); var temp = node[1]; node[1] = node[0]; node[0] = temp}

      // Grab-until-block behavior.
//       Not quite as simple as it sounds. This is used for constructs such as 'if', 'function', etc. Each of these constructs takes the form '<construct> [identifier] () {}', but they can also
//       have variants that include '<construct> () {}', '<construct> () statement;', and most problematically '<construct> () ;'. Some of these constructs also have optional child components; for
//       example, 'if () {} else {}' should be represented by an 'if' whose children are '()', '{}', and 'else' (whose child is '{}'). The tricky part is that 'if' doesn't accept another 'if' as a
//       child (e.g. 'if () {} if () {}'), nor does it accept 'for' or any number of other things. This discrimination is encoded in the parse_accepts table.

      // There are some weird edge cases, as always. The most notable is what happens when we have nesting without blocks:

      // | if (foo) bar; else bif;

      // In this case we want to preserve the semicolon on the 'then' block -- that is, 'bar;' should be its child; so the semicolon is required. But the 'bif' in the 'else' case shouldn't have a
//       semicolon, since that separates top-level statements. Because desperate situations call for desperate measures, there's a hack specifically for this in the syntax tree serialization.

      // One more thing. Firefox rewrites syntax trees, and one of the optimizations it performs on object literals is removing quotation marks from regular words. This means that it will take the
//       object {'if': 4, 'for': 1, etc.} and render it as {if: 4, for: 1, etc.}. As you can imagine, this becomes a big problem as soon as the word 'function' is present in an object literal. To
//       prevent this from causing problems, I only collapse a node if it is not followed by a colon. (And the only case where any of these would legally be followed by a colon is as an object
//       key.)

       else if (has(parse_r_until_block, data) && node.r && node.r.data !== ':')
                                                 {for (var count = 0, limit = parse_r_until_block[data]; count < limit && node.r && ! has(parse_block, node.r.data); ++count) node._fold_r();
                                                  node.r && (node.r.data === ';' ? node.push(empty) : node._fold_r());
                                                  if (has(parse_accepts, data) && parse_accepts[data] === (node.r && node.r.r && node.r.r.data)) node._fold_r().pop()._fold_r();
                                             else if (has(parse_accepts, data) && parse_accepts[data] === (node.r && node.r.data))               node._fold_r()}

      // Optional right-fold behavior.
//       The return, throw, break, and continue keywords can each optionally take an expression. If the token to the right is an expression, then we take it, but if the token to the right is a
//       semicolon then the keyword should be nullary.

       else if (has(parse_r_optional, data))  node.r && node.r.data !== ';' && node._fold_r();

    // Third step.
//     Find all elements with right-pointers and wrap them with semicolon nodes. This is necessary because of certain constructs at the statement-level don't use semicolons; they use brace syntax
//     instead. (e.g. 'if (foo) {bar} baz()' is valid, even though no semicolon precedes 'baz()'.) By this point everything else will already be folded. Note that this does some weird things to
//     associativity; in general, you can't make assumptions about the exact layout of semicolon nodes. Fortunately semicolon is associative, so it doesn't matter in practice. And just in case,
//     these nodes are 'i;' rather than ';', meaning 'inferred semicolon' -- that way it's clear that they aren't original. (They also won't appear when you call toString() on the syntax tree.)

        for (var i = all_nodes.length - 1, _; i >= 0; --i)  (_ = all_nodes[i]).r && _._wrap(new_node(new syntax_node('i;'))).p._fold_r();

    // Fourth step.
//     Flatten out all of the invocation nodes. As explained earlier, they are nested such that the useful data on the right is two levels down. We need to grab the grouping construct on the
//     right-hand side and remove it so that only the invocation or dereference node exists. During the parse phase we built an index of all of these invocation nodes, so we can iterate through
//     just those now. I'm preserving the 'p' pointers, though they're probably not useful beyond here.

        for (var i = 0, l = invocation_nodes.length, _, child; i < l; ++i)  (child = (_ = invocation_nodes[i])[1] = _[1][0] || empty) && (child.p = _);

        while (head.p) head = head.p;

    // Fifth step.
//     Prevent a space leak by clearing out all of the 'p', 'l', and 'r' pointers.

        for (var i = all_nodes.length - 1, _; i >= 0; --i)  delete (_ = all_nodes[i]).p, delete _.l, delete _.r;
        return head};

// Environment-dependent compilation.
// It's possible to bind variables from 'here' (i.e. this runtime environment) inside a compiled function. The way we do it is to create a closure using a gensym. (Another reason that gensyms
// must really be unique.) Here's the idea. We use the Function constructor to create an outer function, bind a bunch of variables directly within that scope, and return the function we're
// compiling. The variables correspond to gensyms placed in the code, so the code will have closure over those variables.

// An optional second parameter 'environment' can contain a hash of variable->value bindings. These will be defined as locals within the compiled function.

// New in caterwaul 0.6.5 is the ability to specify a 'this' binding to set the context of the expression being evaluated.

// Caterwaul 1.0 and later automatically bind a variable called 'undefined' that is set to Javascript's 'undefined' value. This is done to defend against pathological cases of 'undefined' being
// set to something else. If you really wnat some other value of undefined, you can always bind it as an environment variable.

  (function () {var bound_expression_template = caterwaul_global.parse('var _bindings; return(_expression)'),
                    binding_template          = caterwaul_global.parse('_variable = _base._variable'),
                    undefined_binding         = caterwaul_global.parse('undefined = void(0)');

  // Compilation options.
//   Gensym renaming will break some things that expect the compiled code to be source-identical to the original tree. As a result, I'm introducing an options hash that lets you tell the compiler
//   things like "don't rename the gensyms this time around". Right now gensym_renaming is the only option, and it defaults to true.

    caterwaul_global.compile = function (tree, environment, options) {
      options = merge({gensym_renaming: true}, options);

      var bindings = merge({}, this._environment || {}, environment || {}, tree.bindings()), variables = [undefined_binding], s = gensym('base');
      for (var k in bindings) if (own.call(bindings, k) && k !== 'this') variables.push(binding_template.replace({_variable: k, _base: s}));

      var variable_definitions = new this.syntax(',', variables).unflatten(),
          function_body        = bound_expression_template.replace({_bindings: variable_definitions, _expression: tree});

      if (options.gensym_renaming) {var renaming_table = this.gensym_rename_table(function_body);
                                    for (var k in bindings) own.call(bindings, k) && (bindings[renaming_table[k] || k] = bindings[k]);
                                    function_body = function_body.replace(renaming_table);
                                    s             = renaming_table[s]}

      var code = function_body.toString();
      try       {return (new Function(s, code)).call(bindings['this'], bindings)}
      catch (e) {throw new Error((e.message || e) + ' while compiling ' + code)}};

  // Gensym erasure.
//   Gensyms are horrible. They look like foo_1_j15190ba29n1_$1AC151953, which both takes up a lot of space and is hard to read. Fortunately, we can convert them at compile-time. This is possible
//   because Javascript (mostly) supports alpha-conversion for functions.

  // I said "mostly" because some symbols are converted into runtime strings; these are property keys. In the unlikely event that you've got a gensym being used to dereference something, e.g.
//   foo.gensym, then renaming is no longer safe. This, as far as I know, is the only situation where renaming won't work as intended. Because I can't imagine a situation where this would
//   actually arise, I'm not handling this case yet. (Though let me know if I need to fix this.)

  // New gensym names are chosen by choosing the smallest nonnegative integer N such that the gensym's name plus N.toString(36) doesn't occur as an identifier anywhere in the code. (The most
//   elegant option is to use scope analysis to keep N low, but I'm too lazy to implement it.)

    caterwaul_global.gensym_rename_table = function (tree) {
      var names = {}, gensyms = [];
      tree.reach(function (node) {var d = node.data; if (is_gensym(d)) names[d] || gensyms.push(d); names[d] = d.replace(/^(.*)_[a-z0-9]+_.{22}$/, '$1') || 'anon'});

      var unseen_count = {}, next_unseen = function (name) {if (! (name in names)) return name;
                                                            var n = unseen_count[name] || 0; while (names[name + (++n).toString(36)]); return name + (unseen_count[name] = n).toString(36)};

      for (var renamed = {}, i = 0, l = gensyms.length, g; i < l; ++i) renamed[g = gensyms[i]] || (names[renamed[g] = next_unseen(names[g])] = true);
      return renamed}})();

// Initialization method.
// Caterwaul 1.1 is a huge deviation from before. Now you don't use the global caterwaul as a compiler, because it isn't one. Rather, it's a compiler-generator. You pass in arguments to construct
// the new function. So, for example:

// | var compiler = caterwaul(my_macroexpander);
//   compiler(function () {return 5})()            // -> 5, unless your macroexpander does something really bizarre

// The function returned here will have a permanent link to the global caterwaul that generated it, so deglobalizing is a safe thing to do. These generated functions can be composed by doing the
// parse step ahead of time:

// | var my_caterwaul       = caterwaul(my_macroexpander);
//   var my_other_caterwaul = caterwaul(my_other_macroexpander);
//   var compiler           = function (tree) {
//     return caterwaul.compile(my_other_caterwaul(my_caterwaul(caterwaul.parse(tree))));
//   };

// This informs my_caterwaul and my_other_caterwaul that your intent is just to macroexpand trees to trees, not transform functions into other functions.

  caterwaul_global.init = function (macroexpander) {
    var result = function (f, environment, options) {
      return f.constructor === Function || f.constructor === String ? caterwaul_global.compile(result.call(result, caterwaul_global.parse(f)), environment, options) :
                                                      macroexpander ? f.rmap(function (node) {return macroexpander.call(result, node, environment, options)}) : f};
    result.global        = caterwaul_global;
    result.macroexpander = macroexpander;
    return result};

  caterwaul_global.initializer = initializer;
  caterwaul_global.clone       = function () {return se(initializer(initializer, unique).deglobalize(),
                                                        function () {for (var k in caterwaul_global) this[k] || (this[k] = caterwaul_global[k])})};
  return caterwaul = caterwaul_global});

// Generated by SDoc 

// Caterwaul standard library | Spencer Tipping
// Licensed under the terms of the MIT source code license

(caterwaul.std_initializer = function () {

// Internal libraries.
// These operate on caterwaul in some way, but don't necessarily have an effect on generated code.



// Macro authoring utilities | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Macro definitions.
// A macro is simply a partial function from source trees to source trees. It returns a falsy value if it cannot be applied to a given tree; otherwise it returns the replacement (as shown
// above). Because most macros end up replacing one pattern with another, caterwaul lets you use strings instead of requiring you to construct recognizer functions.

// The expander() method distributes across arrays. That is, you can give it an array of things that can be converted into expanders (strings, functions, syntax trees, or arrays), and it will
// build a function that runs backwards through the array, taking the last entry.

(function ($) {
  var syntax_manipulator = function (base_case) {
    var result = function (x) {if (x.constructor === Array) {for (var i = 0, l = x.length, ys = []; i < l; ++i) ys.push(result(x[i]));
                                                             return function (tree) {for (var i = ys.length - 1, r; i >= 0; --i) if (r = ys[i].call(this, tree)) return r}}

                          else return x.constructor === String   ? result($.parse(x)) :
                                      x.constructor === $.syntax ? base_case.call(this, x) : x};
    return result};

  $.pattern      = syntax_manipulator(function (pattern)     {return function (tree)  {return pattern.match(tree)}});
  $.expander     = syntax_manipulator(function (expander)    {return function (match) {return expander.replace(match)}});
  $.alternatives = syntax_manipulator(function (alternative) {throw new Error('must use replacer functions with caterwaul.alternatives()')});

  $.reexpander   = function (expander) {var e = $.expander(expander);
                                        return function (match) {var r = e.call(this, match); return r && this(r)}};

  var composer = function (expander_base_case) {
    return function (pattern, expander) {var new_pattern = $.pattern(pattern), new_expander = expander_base_case(expander);
                                         return function (tree) {var match = new_pattern.call(this, tree); return match && new_expander.call(this, match)}}};

  $.replacer   = composer($.expander);
  $.rereplacer = composer($.reexpander);

// Global macroexpansion.
// This is a shorthand to enable one-off macroexpansion. The idea is that we build a temporary caterwaul function to do some temporary work.

  $.macroexpand = function (tree) {return $($.alternatives(Array.prototype.slice.call(arguments, 1)))(tree)}})(caterwaul);

// Generated by SDoc 





// Symbol anonymization | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Introduction.
// A recurring pattern in previous versions of caterwaul was to clone the global caterwaul function and set it up as a DSL processor by defining a macro that manually dictated tree traversal
// semantics. This was often difficult to implement because any context had to be encoded bottom-up and in terms of searching rather than top-down inference. This library tries to solve the
// problem by implementing a grammar-like structure for tree traversal.

  // Use cases.
//   One fairly obvious use case is code tracing. When we trace some code, we need to keep track of whether it should be interpreted in sequence or expression context. Although there are only two
//   states here, it still is too complex for a single-layer macroexpander to handle gracefully; so we create two separate caterwaul functions that delegate control to one another. We then create
//   a set of annotations to indicate which state or states should be chosen next. For example, here are some expansions from the tracing behavior:

  // | E[_x = _y]  ->  H[_x = E[_y]]
//     S[_x = _y]  ->  _x = E[_y]

  // It's straightforward enough to define macros this way; all that needs to be done is to mark the initial state and put state information into the macro patterns. The hard part is making sure
//   that the markers don't interfere with the existing syntax. This requires that all of the markers be replaced by gensyms before the macroexpansion happens.

  // Gensym anonymizing.
//   Replacing symbols in macro patterns is trivial with the replace() method. The only hard part is performing this same substitution on the macroexpansions. (In fact, this is impossible to do
//   transparently given Turing-complete macros.) In order to work around this, strings are automatically expanded (because it's easy to do), but functions must call translate_state_markers() on
//   any patterns they intend to use. This call must happen before substituting syntax into the patterns (!) because otherwise translate_state_markers() may rewrite code that happens to contain
//   markers, thus reintroducing the collision problem that all of this renaming is intended to avoid.

// Usage.
// To anonymize a set of macros you first need to create an anonymizer. This is easy; you just give it a list of symbols to anonymize and then use that anonymizer to transform a series of macros
// (this process is non-destructive):

// | var anonymize = caterwaul.anonymizer('X', 'Y', 'Z');
//   var m = caterwaul.replacer(anonymize('X[foo]'), ...);    // Matches against gensym_1_aj49Az0_885nr1q[foo]

// Each anonymizer uses a separate symbol table. This means that two anonymizers that match against 'A' (or any other macro pattern) will always map them to different gensyms.

(function ($) {$.anonymizer = function () {for (var translation_table = {}, i = 0, l = arguments.length; i < l; ++i) translation_table[arguments[i]] = $.gensym(arguments[i]);
                                           return function (node) {return $.parse(node).replace(translation_table)}}})(caterwaul);

// Generated by SDoc 




// Language specializations.
// These provide configurations that specialize caterwaul to operate well with a given programming language. This is relevant because not all languages compile to Javascript the same way, and
// caterwaul should be able to adapt to the syntactic limitations of generated code (and thus be usable with non-Javascript languages like Coffeescript).

// Also included is a standard set of words that can be combined with the Javascript forms to produce useful macros. Together these form a base language that is used by other parts of the
// standard library.



// Javascript-specific macros | Spencer Tipping
// Licensed under the terms of the MIT source code license

(function ($) {

// Structured forms in Javascript.
// These aren't macros, but forms. Each language has its own ways of expressing certain idioms; in Javascript we can set up some sensible defaults to make macros more consistent. For example,
// caterwaul pre-1.0 had the problem of wildly divergent macros. The fn[] macro was always prefix and required parameters, whereas /se[] was always postfix and had a single optional parameter.
// /cps[] was similarly postfix, which was especially inappropriate considering that it could theoretically handle multiple parameters.

// In caterwaul 1.0, the macro author's job is reduced to specifying which words have which behavior; the language driver takes care of the rest. For instance, rather than specifying the full
// pattern syntax, you just specify a word and its definition with respect to an opaque expression and perhaps set of modifiers. Here are the standard Javascript macro forms:

  $.js = function (macroexpander) {

// Javascript-specific shorthands.
// Javascript has some syntactic weaknesses that it's worth correcting. These don't relate to any structured macros, but are hacks designed to make JS easier to use.

  // String interpolation.
//   Javascript normally doesn't have this, but it's straightforward enough to add. This macro implements Ruby-style interpolation; that is, "foo#{bar}" becomes "foo" + bar. A caveat (though not
//   bad one in my experience) is that single and double-quoted strings are treated identically. This is because Spidermonkey rewrites all strings to double-quoted form.

  // This version of string interpolation is considerably more sophisticated than the one implemented in prior versions of caterwaul. It still isn't possible to reuse the same quotation marks
//   used on the string itself, but you can now include balanced braces in the interpolated text. For example, this is now valid:

  // | 'foo #{{bar: "bif"}.bar}'

  // There are some caveats; if you have unbalanced braces (even in substrings), it will get confused and misread the boundary of your text. So stuff like this won't work properly:

  // | 'foo #{"{" + bar}'          // won't find the ending properly and will try to compile the closing brace

    var string_interpolator = function (node) {
      var s = node.data, q = s.charAt(0), syntax = $.syntax;
      if (q !== '\'' && q !== '"' || ! /#\{[^\}]+\}/.test(s)) return false;             // DeMorgan's applied to (! ((q === ' || q === ") && /.../test(s)))

      for (var pieces = [], is_code = [], i = 1, l = s.length - 1, brace_depth = 0, got_hash = false, start = 1, c; i < l; ++i)
        if (brace_depth) if ((c = s.charAt(i)) === '}') --brace_depth || (pieces.push(s.substring(start, i)), is_code.push(true)) && (start = i + 1), got_hash = false;
                    else                                brace_depth += c === '{';
   else                  if ((c = s.charAt(i)) === '#') got_hash = true;
                    else if (c === '{' && got_hash)     pieces.push(s.substring(start, i - 1)), is_code.push(false), start = i + 1, ++brace_depth;
                    else                                got_hash = false;

      pieces.push(s.substring(start, l)), is_code.push(false);

      for (var quoted = new RegExp('\\\\' + q, 'g'), i = 0, l = pieces.length; i < l; ++i) pieces[i] = is_code[i] ? this($.parse(pieces[i].replace(quoted, q)).as('(')) :
                                                                                                                    new syntax(q + pieces[i] + q);
      return new syntax('+', pieces).unflatten().as('(')};

  // Destructuring function creation.
//   This is a beautiful hack made possible by Internet Explorer. We can intercept cases of assigning into a function and rewrite them to create a function body. For example, f(x) = y becomes the
//   regular assignment f = function (x) {return y}. Because this macro is repeatedly applied we get currying for free.

  // You can put non-formal expressions into the argument list. There are, in fact, three kinds of things you can use:

  // | 1. Formal parameters -- these are transcribed literally into the compiled function's argument list.
//     2. Before-result side effects -- these are compiled into local variables or statements prior to executing the function body.
//     3. After-result side effects -- these are compiled into statements after executing the function body; the function's result is in scope as a variable called 'result'.

  // The general form of destructuring function definitions is:

  // | f(formals, [before], [after]) = ...

  // This is the compiled output (dependent on whether 'before' and 'after' are specified):

  // | // general case                     // no 'before' cases                  // no 'after' cases                     // neither
//     f = function(formals) {             f = function (formals) {              f = function (formals) {                f = function (formals) {
//       before;                             var result = ...;                     before;                                 ;               // <- I'm too lazy to fix this
//       var result = ...;                   after;                                return ...;                             return ...;
//       after;                              return result;                      };                                      };
//       return result;                    };
//     };

  // There are some rules governing how 'before' and 'after' statements are detected and compiled. They are:

  // | 1. Everything is assumed to be a formal until the first parameter that is not a simple identifier.
//     2. Everything that isn't a formal is assumed to be a 'before' expression until the first expression that mentions 'result'.
//     3. Everything after that is assumed to be an 'after' expression.
//     4. Any 'before' or 'after' expression of the form '_variable = ...' is compiled into a local variable definition rather than a simple assignment. This prevents global scope contention.

  // This notation doesn't preclude the possibility of some form of destructuring binds in the future, since there wouldn't be much point to writing a toplevel array or object literal and
//   intending it to be used as a side-effect. (Doing that would just put the value into void context; at that point you might as well leave it out.)

    var function_local_template = $.parse('var _x = _y'),  function_bind_pattern = $.parse('_x = _y'),  function_result_pattern  = $.parse('result'),

        function_with_afters         = $.parse('function (_formals) {_befores; var result = _result; _afters; return result}'),
        function_without_afters      = $.parse('function (_formals) {_befores; return _result}'),
        function_assignment_template = $.parse('_f = _x'),

        function_is_result           = function (n) {return n.is_empty() && n.data === 'result'},

        function_destructure = $.rereplacer('_f(_xs) = _y', function (match) {for (var formals = [], befores = [], afters = [], ps = match._xs.flatten(','), i = 0, l = ps.length; i < l; ++i)
                                                                                (afters.length  || ps[i].contains(function_is_result) ? afters  :
                                                                                 befores.length || ps[i].length                       ? befores : formals).push(ps[i]);

                                                                              // Convert simple assignments into 'var' definitions in-place. Other 'before' and 'after' statements are coerced
                                                                              // into expression context by wrapping them in parentheses.
                                                                              for (var contains_locals = [befores, afters], i = 0, l = contains_locals.length; i < l; ++i)
                                                                                for (var xs = contains_locals[i], j = 0, lj = xs.length, m; j < lj; ++j)
                                                                                  xs[j] = (m = function_bind_pattern.match(xs[j])) && m._x.is_empty() ? function_local_template.replace(m) :
                                                                                                                                                        xs[j].as('(');
                                                                              var new_formals = formals.length ? new $.syntax(',', formals).unflatten() : $.empty,
                                                                                  new_befores = befores.length ? new $.syntax(';', befores).unflatten() : $.empty,
                                                                                  new_afters  = afters.length  ? new $.syntax(';', afters) .unflatten() : $.empty

                                                                                  template    = function_assignment_template.replace(
                                                                                                  {_f: match._f, _x: afters.length ? function_with_afters : function_without_afters});

                                                                              return template.replace({_formals: new_formals, _befores: new_befores, _afters: new_afters, _result: match._y})});

  // Infix function application.
//   Caterwaul 1.1.2 introduces infix function notation, which lets the user avoid grouping constructs. x /y /... /-f/z becomes f(x, y, ..., z). The same goes for vertical bar syntax; that is, x
//   |y |... |-f| z also becomes f(x, y, ..., z). This macro respects associativity, so you can do this:

  // | x /!f /-g/ y                // -> g(f(x), y)

  // There used to be two different syntaxes depending on whether you wanted binary or n-ary function application. I realized this was probably overkill since the macro now distributes across
//   parse trees appropriately.

    var infix_function = function (node) {var d = node.data, left, fn;
                                          if ((d === '/' || d === '|') && (left = node[0]).data === d && left[1] && left[1].data === 'u-' && (fn = left[1][0]))
                                            return new $.syntax('()', fn, this(node[0][0]).flatten(d).push(this(node[1])).with_data(',').unflatten())};

  // Infix method application.
//   This is subtly different from infix function application in that a method is called. You might want this when dealing with lots of nested methods, which can otherwise become hard to manage.
//   Like infix function application, this macro respects precedence and associativity.

  // | f /g /~a/ h /~b/ i          // -> ((f).a(g, h)).b(i)

    var infix_method = function (node) {var d = node.data, left, fn;
                                        if ((d === '/' || d === '|') && (left = node[0]).data === d && left[1] && left[1].data === 'u~' && (fn = left[1][0])) {
                                          var xs = [].slice.call(this(node[0][0]).flatten(d)), object = xs.shift();
                                          return new $.syntax('()', new $.syntax('.', new $.syntax('(', object), fn), new $.syntax(',', xs, this(node[1])).unflatten())}};

  // Postfix function application.
//   This is a bit simpler than infix function application and is used when you have a unary function. Sometimes it's simpler to think of a function as a filter than as a wrapper, and this macro
//   makes it easier to do that. This is particularly useful when you have many nested function calls, for instance if you're defining multi-level function composition:

  // | compose(f, g, h)(x) = x /!h /!g /!f         // -> f(g(h(x)))
//     x /y /z /!f                                 // -> f(x, y, z)

    var postfix_function_template = $.parse('_f(_x)'),
        postfix_function          = $.rereplacer('_x /!_f', function (match) {return postfix_function_template.replace({_f: match._f,
                                                                                                                        _x: this(match._x).flatten('/').with_data(',').unflatten()})});

  // Literal modification.
//   Caterwaul 1.1.2 introduces literal modification, which provides ways to reinterpret various types of literals at compile-time. These are always written as postfix property accesses, e.g.
//   /foo bar/.x -- here, 'x' is the modifier. Cool as it would be to be able to stack modifiers up, right now Caterwaul doesn't support this. Part of the reason is that I'm too lazy/uninsightful
//   to know how to do it performantly considering the present architecture, but another part of it is that the bugs would become strange and subtle. My goal is to keep the compilation process
//   reasonably transparent, and you can imagine the bizarre chain of events that would occur if someone wrote a modifier that, for instance, returned a different type of literal. It would be
//   utter chaos (though a really cool form of it).

  // Sadly, you can't modify object literals. The reason has to do with syntactic ambiguity. Suppose you've got a function like this:

  // | function () {
//       {foo: 'bar'}.modifier
//       return true;
//     }

  // This function fails to parse under SpiderMonkey, since it assumes that {foo: 'bar'} is a statement-level block with a label 'foo' and a discarded string literal 'bar'. Rather than open this
//   can of worms, I'm just nixing the whole idea of modifying object literals (besides, it doesn't seem particularly useful anyway, though perhaps I'm being myopic about it).

    var modified_literal_form   = $.pattern('_literal._modifier'),

        lookup_literal_modifier = function (caterwaul, type, modifier) {var hash = caterwaul.literal_modifiers[type];
                                                                        return hash.hasOwnProperty(modifier) && hash[modifier]},

        literal_modifier        = function (node) {var modified_literal = modified_literal_form.call(this, node), literal, expander;
                                                   if (modified_literal && (literal  = modified_literal._literal) &&
                                                                           (expander = literal.is_identifier() ? lookup_literal_modifier(this, 'identifier', modified_literal._modifier.data) :
                                                                                       literal.is_array()      ? lookup_literal_modifier(this, 'array',      modified_literal._modifier.data) :
                                                                                       literal.is_regexp()     ? lookup_literal_modifier(this, 'regexp',     modified_literal._modifier.data) :
                                                                                       literal.is_number()     ? lookup_literal_modifier(this, 'number',     modified_literal._modifier.data) :
                                                                                       literal.is_string()     ? lookup_literal_modifier(this, 'string',     modified_literal._modifier.data) :
                                                                                                                 null))
                                                     return expander.call(this, literal)};

  // Modifier syntax.
//   These are the 'structured forms' I was talking about above. Prior to caterwaul 1.1 these were stored as individual pre-expanded macros. This had a number of problems, perhaps most notably
//   that it was extremely inefficient. I loaded up caterwaul in the REPL and found that caterwaul.js_ui(caterwaul.js_all()) had 329 macros installed. This meant 329 tree-match tests for every
//   function.

  // Now modifiers are stored on the compiler function directly. Some modifiers take parameters, so there is always some degree of overhead involved in determining whether a modifier case does in
//   fact match. However, there are only a few checks that need to happen before determining whether a modifier match is possible, unlike before.

    var bracket_modifier_form = $.pattern('_modifier[_expression]'),               slash_modifier_form = $.pattern('_expression /_modifier'),
        minus_modifier_form   = $.pattern('_expression -_modifier'),               in_modifier_form    = $.pattern('_modifier in _expression'),
        pipe_modifier_form    = $.pattern('_expression |_modifier'),               comma_modifier_form = $.pattern('_expression, _modifier'),

        dot_parameters        = $.pattern('_modifier._parameters'),                bracket_parameters  = $.pattern('_modifier[_parameters]'),

        parameterized_wickets = $.pattern('_expression <_modifier> _parameters'),  parameterized_minus = $.pattern('_expression -_modifier- _parameters'),

        modifier = function (node) {var parameterized_match = parameterized_wickets.call(this, node) || parameterized_minus.call(this, node);
                                    if (parameterized_match)
                                      for (var es = this.parameterized_modifiers, i = es.length - 1, r; i >= 0; --i)
                                        if (r = es[i].call(this, parameterized_match)) return r;

                                    var regular_match = bracket_modifier_form.call(this, node) || slash_modifier_form.call(this, node) ||
                                                        minus_modifier_form  .call(this, node) || in_modifier_form   .call(this, node) ||
                                                        pipe_modifier_form   .call(this, node) || comma_modifier_form.call(this, node);

                                    if (regular_match) {
                                      // Could still be a parameterized function; try to match one of the parameter forms against the modifier.
                                      var parameter_match = dot_parameters    .call(this, regular_match._modifier) ||
                                                            bracket_parameters.call(this, regular_match._modifier);

                                      if (parameter_match) {
                                        regular_match._modifier   = parameter_match._modifier;
                                        regular_match._parameters = parameter_match._parameters;

                                        for (var es = this.parameterized_modifiers, i = es.length - 1, r; i >= 0; --i)
                                          if (r = es[i].call(this, regular_match)) return r}

                                      else
                                        for (var es = this.modifiers, i = es.length - 1, r; i >= 0; --i)
                                          if (r = es[i].call(this, regular_match)) return r}};

  // Tying it all together.
//   This is where we write a big macroexpander to perform all of the tasks mentioned above. It just falls through cases, which is now a fairly standard pattern for macros. There is a high-level
//   optimization that we can perform: leaf nodes can only be expanded by the string interpolator, so we try this one first and reject any further matching attempts if the node has no children.
//   Because roughly half of the nodes will have no children, this saves on average 5 matching attempts per node.

  // I've got two closures here to avoid putting a conditional in either one of them. In particular, we know already whether we got a macroexpander, so there's no need to test it inside the
//   function (which will be called lots of times).

    var each_node = function (node) {return string_interpolator.call(this, node) || literal_modifier.call(this, node) ||
                                            node.length && (modifier.call(this, node) || function_destructure.call(this, node) ||
                                                            infix_function.call(this, node) || infix_method.call(this, node) || postfix_function.call(this, node))},

        result    = macroexpander ? $(function (node) {return macroexpander.call(this, node) || each_node.call(this, node)}) :
                                    $(each_node);

    result.modifiers               = [];
    result.parameterized_modifiers = [];

    result.literal_modifiers = {regexp: {}, array: {}, string: {}, number: {}, identifier: {}};

    return result}})(caterwaul);

// Generated by SDoc 





// Javascript literal notation | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Introduction.
// These macros provide some convenient literal notation for various Javascript literals. For obvious reasons they have names that are unlikely to collide with methods.

(function ($) {
  $.js_literals = function (caterwaul_function) {

    var function_template = $.parse('function (_) {return _body}');

  // Regular expression literals.
//   Right now we just support the 'x' flag, which causes all whitespace within the regular expression to be ignored. This is a straightforward preprocessing transformation, since we have access
//   to the regexp in string form anyway.

  // To make Javascript's regular expressions more useful I've also included the 'qf' modifier. This turns a regular expression into a matching function; for example, /foo/.qf becomes (function
//   (s) {return /foo/.exec(s)}).

    (function (r) {r.x  = $.reexpander(function (node) {return node.with_data(node.data.replace(/\s+/g, ''))});

                   var call_exec_template = $.parse('_regexp.exec(_)');
                   r.qf = function (node) {return function_template.replace({_body: call_exec_template.replace({_regexp: node})})}})(caterwaul_function.literal_modifiers.regexp);

  // String literals.
//   There are a couple of things we can do with strings. First, there's the 'qw' modifier, which causes a string to be split into an array of words at compile-time. So, for instance, the
//   expression 'foo bar bif'.qw would be compiled into ['foo', 'bar', 'bif']. Another modifier is 'qh', which is like 'qw' but creates a hash instead. So 'foo bar bif baz'.qh would result in
//   {foo: 'bar', bif: 'baz'}. There's also qr, which converts from a string to a regular expression and does all of the appropriate escape conversions. Some care should be taken with this,
//   however, because not all regexp escapes are valid in strings. In particular, you can't do things like 'foo\[bar\]'.qr because \[ isn't recognized in strings.

  // Another modifier is 'qs', which is rarely used outside of the context of writing macros. The idea here is to have Caterwaul parse the string and return a reference to the parse tree. So, for
//   example, 'foo.bar'.qs is compiled into a reference to the parse tree for foo.bar. A caveat here is that the parse happens only once, so any mutations that happen to the syntax tree are
//   persisted across invocations. (Unlike the way that array and object literals are interpreted, which is to create a new array or object each time that node is evaluated.)

  // Functions can be written concisely using qf. This causes the string to be interpreted as the body of a function whose sole argument is called _. This may change at some point in the future.

    (function (s) {s.qw = $.reexpander(function (node) {for (var array_node = new $.syntax('['), comma = new $.syntax(','), delimiter = node.data.charAt(0),
                                                                 pieces = node.as_escaped_string().split(/\s+/), i = 0, l = pieces.length; i < l; ++i)
                                                          comma.push(new $.syntax(delimiter + pieces[i] + delimiter));
                                                        return array_node.push(comma.unflatten())});

                   s.qh = $.reexpander(function (node) {for (var hash_node = new $.syntax('{'), comma = new $.syntax(','), delimiter = node.data.charAt(0),
                                                                 pieces = node.as_escaped_string().split(/\s+/), i = 0, l = pieces.length; i < l; i += 2)
                                                          comma.push(new $.syntax(':', new $.syntax(delimiter + pieces[i] + delimiter), new $.syntax(delimiter + pieces[i + 1] + delimiter)));
                                                        return hash_node.push(comma.unflatten())});

                   s.qr = $.reexpander(function (node) {return node.with_data('/' + node.as_escaped_string().replace(/\//g, '\\/') + '/')});

                   s.qs = function (node) {return new $.ref($.parse(node.as_unescaped_string()))};

                   s.qf = $.reexpander(function (node) {return function_template.replace({_body: $.parse(node.as_unescaped_string())})})})(caterwaul_function.literal_modifiers.string);

    return caterwaul_function}})(caterwaul);

// Generated by SDoc 





// Common adjectives and adverbs | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Introduction.
// This behavior installs a bunch of common words and sensible behaviors for them. The goal is to handle most Javascript syntactic cases by using words rather than Javascript primitive syntax.
// For example, constructing lambdas can be done with 'given' rather than the normal function() construct:

// | [1, 2, 3].map(x + 1, given[x])        // -> [1, 2, 3].map(function (x) {return x + 1})

// In this case, given[] is registered as a postfix binary adverb. Any postfix binary adverb forms added later will extend the possible uses of given[].

(function ($) {
  $.words = function (caterwaul_function) {
    var filtered_expander      = function (word, expander) {return function (match) {return match._modifier.data === word && expander.call(this, match)}},

        modifier               = function (word, expander) {caterwaul_function.modifiers              .push(filtered_expander(word, expander))},
        parameterized_modifier = function (word, expander) {caterwaul_function.parameterized_modifiers.push(filtered_expander(word, expander))};

  // Quotation.
//   qs[] comes from pre-1.0 caterwaul; this lets you quote a piece of syntax, just like quote in Lisp. The idea is that qs[something] returns 'something' as a syntax tree. qse[] is a variant
//   that macroexpands the syntax tree before returning it; this used to be there for performance reasons (now irrelevant with the introduction of precompilation) but is also useful for macro
//   reuse.

    modifier('qs',  function (match) {return new $.ref(match._expression, 'qs')});
    modifier('qse', function (match) {return new $.ref(this(match._expression), 'qse')});

  // Macroexpansion control.
//   Sometimes it's useful to request an additional macroexpansion or suppress macroexpansion for a piece of code. The 'reexpand' and 'noexpand' modifiers do these two things, respectively.

    modifier('reexpand', function (match) {return this(this(match._expression))});
    modifier('noexpand', function (match) {return match._expression});

  // Error handling.
//   Javascript in particular has clunky error handling constructs. These words provide error handling in expression context.

    modifier              ('raise',  $.reexpander('(function () {throw _expression}).call(this)'));
    parameterized_modifier('rescue', $.reexpander('(function () {try {return (_expression)} catch (e) {return (_parameters)}}).call(this)'));

  // Evaluation.
//   Caterwaul 1.1.2 introduces the 'eval' modifier, which lets you force certain expressions to be evaluated at compile-time. A reference containing the resulting value is dropped into the code,
//   and any errors are reported as compile-time errors. The expression being evaluated is macroexpanded under the compiling caterwaul function.

    modifier('eval', function (match) {return new $.ref($.compile(this(match._expression)), 'eval')});

// Scoping and referencing.
// These all impact scope or references somehow -- in other words, they create variable references but don't otherwise impact the nature of evaluation.

  // Function words.
//   These define functions in some form. given[] and bgiven[] are modifiers to turn an expression into a function; given[] creates a regular closure while bgiven[] preserves the closure binding.
//   For example:

  // | var f = x + 1 -given [x];
//     var f = x + 1 -given.x;

    parameterized_modifier('given',  $.reexpander('(function (_parameters) {return _expression})'));
    parameterized_modifier('bgiven', $.reexpander('(function (t, f) {return (function () {return f.apply(t, arguments)})})(this, (function (_parameters) {return _expression}))'));

  // Nullary function words.
//   These are used to provide quick function wrappers for values. There are actually a couple of possibilities here. One is to wrap a value in a nullary function that recomputes its expression
//   each time, and another is to compute the value lazily and return the cached value for each future invocation. The modifiers are called 'delay' and 'lazy', and they always bind to the
//   surrounding context (analogous to bgiven, above).

  // Here are their operational semantics by example:

  // | var x = 10;
//     var f = ++x -delay;
//     f()         -> 11
//     f()         -> 12
//     var g = ++x -lazy;
//     g()         -> 13
//     g()         -> 13

    modifier('delay', $.reexpander('(function (t, f) {return (function () {return f.call(t)})})(this, (function () {return _expression}))'));
    modifier('lazy',  $.reexpander('(function (t, f, v, vc) {return (function () {return vc ? v : (vc = true, v = f.call(t))})})(this, (function () {return _expression}))'));

  // Side-effecting.
//   The goal here is to take an existing value, modify it somehow, and then return it without allocating an actual variable. This can be done using the /se[] adverb. Older versions of caterwaul
//   bound the variable as _; version 1.0 changes this convention to bind the variable to 'it'. For example:

  // | hash(k, v) = {} /se[it[k] = v];
//     compose(f, g)(x) = g(x) -re- f(it);

    parameterized_modifier('se', $.reexpander('(function (it) {return (_parameters), it}).call(this, (_expression))'));
    parameterized_modifier('re', $.reexpander('(function (it) {return (_parameters)}).call(this, (_expression))'));

  // Scoping.
//   You can create local variables by using the where[] modifier. If you do this, the locals can all see each other since they're placed into a 'var' statement. For example:

  // | where[x = 10][alert(x)]
//     alert(x), where[x = 10]

    parameterized_modifier('where', $.reexpander('(function () {var _parameters; return (_expression)}).call(this)'));

  // Object construction.
//   This is similar to where[], but constructs a hash object instead of binding local variables. The idea is to be able to use the f(x) = x + 1 function notation but end up with an object. You
//   can also use regular assignments, each of which will be converted into a key/value pair:

  // | var o = capture [f(x) = 10, g(x)(y) = x + y];
//     o.g(10)(20)         // -> 30

    modifier('capture', function (match) {for (var r = new $.syntax('{'), comma = new $.syntax(','), bindings = match._expression.flatten(','), i = 0, l = bindings.length; i < l; ++i)
                                            comma.push(this(bindings[i]).with_data(':'));
                                          return r.push(comma.unflatten())});

  // Importation.
//   This is a fun one. Caterwaul 1.1.2 introduces the 'using' modifier, which lets you statically import an object. For example:

  // | log(x) -using- console              // -> (function () {var log = console.log; return log(x)}).call(this)

  // Variables are computed at compile-time, not at runtime. This is much better than using the 'with' keyword, which degrades performance ('using' has no significant performance impact).
//   However, the calling context is incomplete, as shown above. In particular, methods of the object that you're using will be called with a global 'this' rather than being bound to the object.

    var scope_template = $.parse('(function () {var _variables; return _expression}).call(this)');
    parameterized_modifier('using', $.reexpander(function (match) {var o = $.compile(this(match._parameters)), comma = new $.syntax(',');
                                                                   for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) comma.push(new $.syntax('=', k, new $.ref(o[k])));
                                                                   return scope_template.replace({_variables: comma.unflatten(), _expression: match._expression})}));

// Control flow modifiers.
// These impact how something gets evaluated.

  // Conditionals.
//   These impact whether an expression gets evaluated. x /when.y evaluates to x when y is true, and y when y is false. Similarly, x /unless[y] evaluates to x when y is false, and !y when y is
//   truthy.

    parameterized_modifier('when',   $.reexpander('((_parameters) && (_expression))'));
    parameterized_modifier('unless', $.reexpander('(! (_parameters) && (_expression))'));

    return caterwaul_function}})(caterwaul);

// Generated by SDoc 




// Libraries.
// These apply more advanced syntactic transforms to the code and can depend on everything above.



// Sequence comprehensions | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Introduction.
// Caterwaul pre-1.0 had a module called 'seq' that provided a finite and an infinite sequence class and localized operator overloading to make them easier to use. Using wrapper classes was both
// unnecessary (since most sequence operations were done inside the seq[] macro anyway) and problematic, as it required the user to remember to cast sequences back into arrays and such. It also
// reduced runtime performance and created a lot of unnecessary copying.

// Caterwaul 1.0 streamlines the seq[] macro by removing the sequence classes and operating directly on arrays or array-like things. Not everything in Javascript is an array, but I'm going to
// pretend that everything is (or at least looks like one) and rely on the [i] and .length properties. This allows the sequence library to (1) have a very thin design, and (2) compile down to
// tight loops without function calls.

// Distributive property.
// The seq[] modifier distributes across several operators. They are:

// | 1. Ternary ?:
//   2. Short-circuit && and ||
//   3. Parentheses

// It won't cross a square-bracket or invocation boundary, however. This includes distributing over array elements and [] dereferencing. You can cause it to cross an array boundary by prefixing
// the array with ~ (which should be familiar, as it is the same syntax that's used to cause function bodies to be interpreted in sequence context). For instance:

// | [1, 2, 3, X] -seq             // <- X is interpreted in regular Javascript context
//   ~[1, 2, 3, X] -seq            // <- X is interpreted in sequence context

// Notation.
// The notation is mostly a superset of the pre-1.0 sequence notation. Operators that have the same functionality as before (others are reserved for future meanings, but probably won't do what
// they used to):

// | *  = map                      e.g.  [1, 2, 3] *[x + 1] |seq            ->  [2, 3, 4]
//   *! = each                     e.g.  [1, 2, 3] *![console.log(x)] |seq  ->  [1, 2, 3]  (and logs 1, 2, 3)
//   /  = foldl                    e.g.  [1, 2, 3] /[x - next] |seq         ->  -4
//   /! = foldr                    e.g.  [1, 2, 3] /![x - next] |seq        ->  2
//   %  = filter                   e.g.  [1, 2, 3] %[x & 1] |seq            ->  [1, 3]
//   %! = filter-not               e.g.  [1, 2, 3] %![x & 1] |seq           ->  [2]
//   +  = concatenate              e.g.  [1, 2, 3] + [4, 5] |seq            ->  [1, 2, 3, 4, 5]
//   -  = cartesian product        e.g.  [1, 2] - [3, 4] |seq               ->  [[1, 3], [1, 4], [2, 3], [2, 4]]
//   ^  = zip                      e.g.  [1, 2, 3] ^ [4, 5, 6] |seq         ->  [[1, 4], [2, 5], [3, 6]]
//   |  = exists                   e.g.  [1, 2, 3] |[x === 2] |seq          ->  true

// Note that ^ has higher precedence than |, so we can use it in a sequence comprehension without interfering with the |seq macro (so long as the |seq macro is placed on the right).

  // Modifiers.
//   Modifiers are unary operators that come after the primary operator. These have the same (or similar) functionality as before:

  // | ~ = interpret something in sequence context   e.g.  [[1], [2], [3]] *~[x *[x + 1]] |seq  ->  [[2], [3], [4]]
//     x = rename the variable from 'x'              e.g.  [1, 2, 3] *y[y + 1] |seq             ->  [2, 3, 4]

  // Here, 'x' means any identifier. Caterwaul 1.0 introduces some new stuff. The map function now has a new variant, *~!. Filter also supports this variant. Like other operators, they support
//   variable renaming and sequence context. You can do this by putting those modifiers after the *~!; for instance, xs *~!~[exp] interprets 'exp' in sequence context. Similarly, *~!y[exp] uses
//   'y' rather than 'x'.

  // | *~! = flatmap         e.g. [1, 2, 3] *~![[x, x + 1]] |seq      ->  [1, 2, 2, 3, 3, 4]
//     %~! = map/filter      e.g. [1, 2, 3] %~![x & 1 && x + 1] |seq  ->  [2, 4]
//     /~! = unfold          e.g. 1 /~![x < 5 ? x + 1 : null] |seq    ->  [1, 2, 3, 4, 5]

  // Variables.
//   All of the variables from before are still available and the naming is still mostly the same. Each block has access to 'x', which is the immediate element. 'xi' is the index, and 'x0' is the
//   alternative element for folds. Because all sequences are finite, a new variable 'xl' is available -- this is the total number of elements in the source sequence. The sequence object is no
//   longer accessible because there may not be a concrete sequence. (I'm leaving room for cross-operation optimizations in the future.) The renaming is done exactly as before:

  // | [1, 2, 3] *[x + 1] |seq             -> [2, 3, 4]
//     [1, 2, 3] *y[y + 1] |seq            -> [2, 3, 4]
//     [1, 2, 3] *[xi] |seq                -> [0, 1, 2]
//     [1, 2, 3] *foo[fooi] |seq           -> [0, 1, 2]

  // Word operators.
//   Some operators are designed to work with objects, just like in prior versions. However, the precedence has been changed to improve ergonomics. For example, it's uncommon to use objects as an
//   intermediate form because all of the sequence operators are built around arrays. Similarly, it's very common to unpack objects immediately before using them. Therefore the unpack operators
//   should be very high precedence and the pack operator should have very low precedence:

  // | {foo: 'bar'} /keys |seq             -> ['foo']
//     {foo: 'bar'} /values |seq           -> ['bar']
//     {foo: 'bar'} /pairs |seq            -> [['foo', 'bar']]
//     {foo: 'bar'} /pairs |object |seq    -> {foo: 'bar'}

  // Note that unlike regular modifiers you can't use a variety of operators with each word. Each one is defined for just one form. I may change this in the future, but I'm reluctant to start
//   with it because it would remove a lot of syntactic flexibility.

  // Update: After using this in the field, I've found that the low-precedence |object form is kind of a pill. Now the sequence library supports several variants, /object, -object, and |object.

  // Prefixes.
//   New in Caterwaul 1.0.3 is the ability to specify the scope of operation for sequence macros. For instance, you might want to operate on one of several types of data. Normally the sequence
//   macro assumes arrays, but you may want to modify a unary operator such as *[] to transform an object's keys or values. Prefixes let you do this.

  // | o %k*[x.substr(1)] -seq     (equivalent to  o /pairs *[[x[0].substr(1), x[1]]]  -object -seq)
//     o %v*[x.split(/a/)] -seq    (equivalent to  o /pairs *[[x[0], x[1].split(/a/)]] -object -seq)

  // Prefixes are generally faster than manual unpacking and repacking. However, some operations (e.g. fold and its variants) don't work with prefixes. The reason is that it's unclear what to do
//   with the values that correspond to a folded key, for instance. (Imagine what this would mean: o %k/[x + x0] -seq) The following operators can be used with prefixes:

  // | *   = map
//     *!  = each          <- returns the original object
//     %   = filter        <- removes key/value pairs
//     %!  = filter-not
//     %~! = map-filter    <- changes some key-value pairs, removes others

  // These operators support the standard set of modifiers, including ~ prefixing and variable renaming. However, indexing variables such as xi and xl are unavailable because no temporary arrays
//   are constructed.

  // The following operators cannot be used with prefixes because it's difficult to imagine what purpose they would serve:

  // | *~! = flatmap
//     /   = foldl
//     /!  = foldr
//     /~! = unfold

  // None of the binary operators (e.g. +, -, ^, etc) can be used with prefixes because of precedence. Any prefix would bind more strongly to the left operand than it would to the binary
//   operator, which would disrupt the syntax tree.

  // Folding prefixes.
//   New in Caterwaul 1.1 is the ability to specify fold prefixes. This allows you to specify the initial element of a fold:

  // | xs /[0][x0 + x*x] -seq              (sum the squares of each element)
//     xs /~[[]][x0 + [x, x + 1]] -seq     (equivalent to  xs *~![[x, x + 1]] -seq)

  // Function promotion.
//   Caterwaul 1.1 also adds support for implicit function promotion of sequence block expressions:

  // | f(x) = x + 1
//     seq in [1, 2, 3] *f
//     seq in [-1, 0, 1] %f

  // You can use this to make method calls, which will remain bound to the original object:

  // | xs *foo.bar -seq            (equivalent to  xs *[foo.bar(x)] -seq)
//     xs *(bar + bif).baz -seq    (equivalent to  xs *[(bar + bif).baz(x)] -seq)

  // The only restriction is that you can't use a bracketed expression as the last operator; otherwise it will be interpreted as a block. You also can't invoke a promoted function in sequence
//   context, since it is unclear what the intent would be.

    // Calling convention.
//     All functions you promote will always be called with these arguments, in this order:

    // | f(x, x0, xi, xl)

    // This may seem strange, since x0 may or may not be defined. I chose this setup to simplify code generation, even if it is a bit redundant. If x0 isn't provided by the current operator, then
//     its value will be undefined.

  // Scope wrapping.
//   Normally sequences use thin compilation; that is, the body of each sequence element is inserted directly into a for-loop. This increases performance by eliminating a function call, but it
//   has the usual caveats about variable sharing. For instance:

  // | fs = [1, 2, 3] *[delay in x] -seq
//     fs[0]()                     -> 3  (counterintuitive)
//     fs[1]()                     -> 3  (counterintuitive)
//     fs[2]()                     -> 3  (expected)

  // The problem is that all three closures get the same value of 'x', which is a single lexically-scoped variable. To fix this, caterwaul 1.1 introduces the unary + modifier on blocks. This
//   wraps them in a closure to give each iteration its own lexical scope:

  // | fs = [1, 2, 3] *+[delay in x] -seq
//     fs[0]()                     -> 1
//     fs[1]()                     -> 2
//     fs[2]()                     -> 3

  // Numbers.
//   Caterwaul 1.0 removes support for the infinite stream of naturals (fun though it was), since all sequences are now assumed to be finite and are strictly evaluated. So the only macros
//   available are n[] and ni[], which generate finite sequences of evenly-spaced numbers. The only difference between n[] and ni[] is that ni[] uses an inclusive upper bound, whereas n[] is
//   exclusive.

  // | n[1, 10] -seq               ->  [1, 2, 3, 4, 5, 6, 7, 8, 9]
//   | ni[1, 10] -seq              ->  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
//     n[10] -seq                  ->  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
//     ni[10] -seq                 ->  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
//     n[0, 10, 2] -seq            ->  [0, 2, 4, 6, 8]
//     ni[0, 10, 2] -seq           ->  [0, 2, 4, 6, 8, 10]

  // Slicing.
//   There are two reasons you might want to slice something. One is that you're legitimately taking a subsequence of the original thing; in that case, you can invoke the .slice() method
//   manually. The more interesting case is when you want to promote a non-array into an array. This is such a common thing to do (and has so much typing overhead) that I've dedicated a shorthand
//   to it:

  // | +xs -seq, where [xs = arguments]            -> Array.prototype.slice.call(arguments)

// Generated code.
// Previously the code was factored into separate methods that took callback functions. (Basically the traditional map/filter/each arrangement in functional languages.) However, now the library
// optimizes the methods out of the picture. This means that now we manage all of the dataflow between the different sequence operators. I thought about allocating gensym variables -- one for
// each temporary result -- but this means that the temporary results won't be garbage-collected until the entire sequence comprehension is complete. So instead it generates really gnarly code,
// with each dependent sequence listed in the for-loop variable initialization.

// Luckily this won't matter because, like, there aren't any bugs or anything ;)

  // Type closure.
//   Caterwaul 1.1.3 includes a modification that makes the sequence library closed over types. Suppose you've got a special collection type that you want to use instead of arrays. A sequence
//   operation will assume that your collection type implements .length and [i], but any maps or flat maps that you do will return new instances of your type rather than generalizing to a regular
//   array. For example:

  // | xs = new my_sequence();
//     ys = xs *f -seq;
//     ys.constructor === xs.constructor           // -> true

  // In order for this to work, your sequence classes need to implement a nullary constructor that creates an empty instance. They should also implement a variadic push() method.

  // Note that this is a breaking change! The fix is to prepend sequence variables with '+' (see 'Slicing' above). This breaks any code that relies on the seq library taking care of Arguments
//   objects by promoting them into arrays.

// Portability.
// The seq library is theoretically portable to syntaxes besides JS, but you'll probably want to do some aggressive preprocessing if you do this. It assumes a lot about operator precedence and
// such (from a design perspective).

caterwaul.words(caterwaul.js())(function ($) {
  $.seq(caterwaul_function) = caterwaul_function -se-
                              it.modifiers.push(given.match in seq_expand.call(seq_expand, anon_pattern.replace({_x: match._expression})) -re- this(it) /when.it
                                                               -when [match._modifier.data === 'seq'])

                              -where [anon_pattern = anon('S[_x]'),
                                      seq_expand   = $($.alternatives(operator_macros.concat(word_macros)))],

  where [anon            = $.anonymizer('S'),
         rule(p, e)      = $.rereplacer(p.constructor === String ? anon(p) : p, e.constructor === String ? anon(e) : e),

         operator_macros = [rule('S[_x]', '_x'),  rule('S[_xs + _ys]', concat),  rule('S[_xs ^ _ys]', zip),  rule('S[_xs - _ys]', cross),

                                                  // Distributive property
                                                  rule('S[(_x)]', '(S[_x])'),  rule('S[_x[_y]]', 'S[_x][_y]'),     rule('S[_xs(_ys)]', 'S[_xs](_ys)'),
                                                  rule('S[[_x]]', '[_x]'),     rule('S[_x, _y]', 'S[_x], S[_y]'),  rule('S[_xs._p]',   'S[_xs]._p'),

                                                  rule('S[~[_x]]', '[S[_x]]'),          // <- ~ modifier on arrays

                                                  rule('S[_x ? _y : _z]', '(S[_x]) ? (S[_y]) : (S[_z])'), rule('S[_x && _y]', '(S[_x]) && (S[_y])'), rule('S[_x || _y]', '(S[_x]) || (S[_y])'),

                                                  // Unary seq operators
                                                  rule('S[+_xs]', 'Array.prototype.slice.call((_xs))'),

                                                  rule('S[_xs %_thing]',   handle_filter_forms),   rule('S[_xs *_thing]',   handle_map_forms),
                                                  rule('S[_xs /_thing]',   handle_fold_forms),     rule('S[_xs |_thing]',   handle_exists_forms),

                                                  rule('S[_xs %k*_thing]', handle_kmap_forms),     rule('S[_xs %v*_thing]', handle_vmap_forms),
                                                  rule('S[_xs %k%_thing]', handle_kfilter_forms),  rule('S[_xs %v%_thing]', handle_vfilter_forms)]

                    -where [// High-level form specializations
                            unrecognized(reason)                   = raise [new Error(reason)],
                            use_form(form, xs, body, init, vars)   = form ? form.replace({_f: body, _init: init}).replace($.merge({_xs: xs}, vars)) :
                                                                            unrecognized('unsupported sequence operator or modifiers used on #{body}'),

                            operator_case(forms)(match)            = parse_modifiers(match._thing,
                                                                                     use(forms.normal, forms.inormal), use(forms.bang, forms.ibang), use(forms.tbang, forms.itbang))

                                                                     -where [xs                                     = match._xs,
                                                                             expander                               = this,
                                                                             form_function(form)(body, vars)        = use_form(form, xs, body, null, vars),
                                                                             iform_function(form)(body, init, vars) = use_form(form, xs, body, init, vars),
                                                                             use(form, iform)(body)                 = parse_body(body, expander, form_function(form), iform_function(iform))],

                            handle_map_forms                       = operator_case({normal: map,     bang: each,        tbang: flatmap}),
                            handle_filter_forms                    = operator_case({normal: filter,  bang: filter_not,  tbang: map_filter}),
                            handle_fold_forms                      = operator_case({normal: foldl,   bang: foldr,       tbang: unfold,     inormal: ifoldl,  ibang: ifoldr}),

                            handle_kmap_forms                      = operator_case({normal: kmap,    bang: keach}),
                            handle_kfilter_forms                   = operator_case({normal: kfilter, bang: kfilter_not, tbang: kmap_filter}),
                            handle_vmap_forms                      = operator_case({normal: vmap,    bang: veach}),
                            handle_vfilter_forms                   = operator_case({normal: vfilter, bang: vfilter_not, tbang: vmap_filter}),

                            handle_exists_forms                    = operator_case({normal: exists}),

                            // Body parsing
                            block                                  = anon('[_x]'),
                            block_with_variable                    = anon('_var[_x]'),
                            block_with_init                        = anon('[_init][_x]'),
                            block_with_variable_and_init           = anon('_var[_init][_x]'),

                            block_with_closure                     = anon('+_x'),
                            block_with_seq                         = anon('~_x'),

                            standard_names                         = {_x: 'x', _x0:    'x0', _xi:    'xi', _xl:    'xl'},
                            prefixed_names(p)                      = {_x:  p , _x0: '#{p}0', _xi: '#{p}i', _xl: '#{p}l'},

                            function_promotion                     = anon('_f(_x, _x0, _xi, _xl)'),
                            promote_function(f)                    = function_promotion.replace({_f: f}),

                            closure_wrapper                        = anon('(function (_x, _x0, _xi, _xl) {return _f}).call(this, _x, _x0, _xi, _xl)'),
                            close_body(vars, f)                    = closure_wrapper.replace(vars).replace({_f: f}),

                            seq_pattern                            = anon('S[_x]'),
                            promote_seq(f)                         = seq_pattern.replace({_x: f}),

                            parse_body(tree, expand, normal, init) = ((r = block_with_seq.match(tree))               ? parse_body(r._x, expand, sequence_context_normal, sequence_context_init) :
                                                                      (r = block_with_closure.match(tree))           ? parse_body(r._x, expand, wrapping_normal, wrapping_init) :

                                                                      (r = block_with_variable_and_init.match(tree)) ? init(r._x, r._init, prefixed_names(r._var)) :
                                                                      (r = block_with_init.match(tree))              ? init(r._x, r._init, standard_names) :

                                                                      (r = block_with_variable.match(tree))          ? normal(r._x, prefixed_names(r._var)) :
                                                                      (r = block.match(tree))                        ? normal(r._x, standard_names) :
                                                                                                                       normal(promote_function(tree), standard_names))

                                                                     -where [in_sequence_context(f)                           = expand.call(expand, promote_seq(f)),
                                                                             sequence_context_normal(f, names)                = normal(in_sequence_context(f), names),
                                                                             sequence_context_init(f, init_expression, names) = init  (in_sequence_context(f), init_expression, names),

                                                                             wrapping_normal(f, names)                        = normal(close_body(names, f), names),
                                                                             wrapping_init(f, init_expression, names)         = init  (close_body(names, f), init_expression, names),

                                                                             r                                                = null],
                            // Modifier parsing
                            tbang_modifier = anon('~!_x'),
                            bang_modifier  = anon('!_x'),

                            parse_modifiers(tree, normal, bang, tbang) = ((result = tbang_modifier.match(tree)) ? tbang(result._x) :
                                                                          (result =  bang_modifier.match(tree)) ?  bang(result._x) : normal(tree)) -where [result = null]]

                    -where [// Setup for form definitions (see below)
                            loop_anon   = $.anonymizer('xs', 'ys', 'x', 'y', 'i', 'j', 'l', 'lj', 'r', 'o', 'k'),
                            scope       = anon('(function (xs) {var _x, _x0, _xi, _xl; _body}).call(this, S[_xs])'),
                            scoped(t)   = scope.replace({_body: t}),
                            expand(s)   = s.replace(/@/g, 'Array.prototype.slice.call').replace(/#/g, 'Object.prototype.hasOwnProperty.call'),

                            form(x)     = x /!expand /!anon /!scoped /!loop_anon,

                            // Form definitions
                            map         = form('for (var ys = new xs.constructor(), _xi = 0, _xl = xs.length; _xi < _xl; ++_xi) _x = xs[_xi], ys.push((_f));              return ys'),
                            each        = form('for (var                            _xi = 0, _xl = xs.length; _xi < _xl; ++_xi) _x = xs[_xi], (_f);                       return xs'),
                            flatmap     = form('for (var ys = new xs.constructor(), _xi = 0, _xl = xs.length; _xi < _xl; ++_xi) _x = xs[_xi], ys.push.apply(ys, @((_f))); return ys'),

                            filter      = form('for (var ys = new xs.constructor(), _xi = 0, _xl = xs.length;     _xi < _xl; ++_xi) _x = xs[_xi], (_f) && ys.push(_x);        return ys'),
                            filter_not  = form('for (var ys = new xs.constructor(), _xi = 0, _xl = xs.length;     _xi < _xl; ++_xi) _x = xs[_xi], (_f) || ys.push(_x);        return ys'),
                            map_filter  = form('for (var ys = new xs.constructor(), _xi = 0, _xl = xs.length, _y; _xi < _xl; ++_xi) _x = xs[_xi], (_y = (_f)) && ys.push(_y); return ys'),

                            foldl       = form('for (var _x0 = xs[0], _xi = 1, _xl = xs.length;            _xi < _xl; ++_xi) _x = xs[_xi], _x0 = (_f); return _x0'),
                            foldr       = form('for (var _xl = xs.length, _xi = _xl - 2, _x0 = xs[_xl - 1]; _xi >= 0; --_xi) _x = xs[_xi], _x0 = (_f); return _x0'),
                            unfold      = form('for (var ys = [], _x = xs, _xi = 0;                     _x !== null; ++_xi) ys.push(_x), _x = (_f);    return ys'),

                            ifoldl      = form('for (var _x0 = (_init), _xi = 0, _xl = xs.length;      _xi < _xl; ++_xi) _x = xs[_xi], _x0 = (_f);     return _x0'),
                            ifoldr      = form('for (var _xl = xs.length - 1, _xi = _xl, _x0 = (_init); _xi >= 0; --_xi) _x = xs[_xi], _x0 = (_f);     return _x0'),

                            exists      = form('for (var _x = xs[0], _xi = 0, _xl = xs.length, x; _xi < _xl; ++_xi) {_x = xs[_xi]; if (x = (_f)) return x} return false'),

                            concat      = anon('(S[_xs]).concat((S[_ys]))'),

                            zip         = form('for (var ys = (S[_ys]), pairs = [], i = 0, l = xs.length; i < l; ++i) pairs.push([xs[i], ys[i]]); return pairs'),
                            cross       = form('for (var ys = (S[_ys]), pairs = [], i = 0, l = xs.length, lj = ys.length; i < l; ++i) ' +
                                                 'for (var j = 0; j < lj; ++j) pairs.push([xs[i], ys[j]]);' + 'return pairs'),

                            kmap        = form('var r = new xs.constructor();    for (var _x in xs) if (#(xs, _x)) r[_f] = xs[_x]; return r'),
                            keach       = form('                                 for (var _x in xs) if (#(xs, _x)) _f;             return xs'),

                            kfilter     = form('var r = new xs.constructor();    for (var _x in xs) if (#(xs, _x) &&      (_f))  r[_x] = xs[_x]; return r'),
                            kfilter_not = form('var r = new xs.constructor();    for (var _x in xs) if (#(xs, _x) &&    ! (_f))  r[_x] = xs[_x]; return r'),
                            kmap_filter = form('var r = new xs.constructor(), x; for (var _x in xs) if (#(xs, _x) && (x = (_f))) r[x]  = xs[_x]; return r'),

                            vmap        = form('var r = new xs.constructor();    for (var  k in xs) if (#(xs, k)) _x = xs[k], r[k] = (_f); return r'),
                            veach       = form('                                 for (var  k in xs) if (#(xs, k)) _x = xs[k], _f;          return xs'),

                            vfilter     = form('var r = new xs.constructor();    for (var  k in xs) if (#(xs, k)) _x = xs[k],        (_f) && (r[k] = _x); return r'),
                            vfilter_not = form('var r = new xs.constructor();    for (var  k in xs) if (#(xs, k)) _x = xs[k],        (_f) || (r[k] = _x); return r'),
                            vmap_filter = form('var r = new xs.constructor(), x; for (var  k in xs) if (#(xs, k)) _x = xs[k], x = (_f), x && (r[k] =  x); return r')],

         word_macros     = [rule('S[n[_upper]]',                n),  rule('S[ni[_upper]]',                ni),  rule('S[_o /keys]',   keys),    rule('S[_o |object]', object),
                            rule('S[n[_lower, _upper]]',        n),  rule('S[ni[_lower, _upper]]',        ni),  rule('S[_o /values]', values),  rule('S[_o -object]', object),
                            rule('S[n[_lower, _upper, _step]]', n),  rule('S[ni[_lower, _upper, _step]]', ni),  rule('S[_o /pairs]',  pairs),   rule('S[_o /object]', object)]

                    -where [n(match)   = n_pattern .replace($.merge({_lower: '0', _step: '1'}, match)),
                            ni(match)  = ni_pattern.replace($.merge({_lower: '0', _step: '1'}, match)),

                            n_pattern  = anon('(function (i, u, s) {if ((u - i) * s <= 0) return [];' +                // Check for degenerate iteration
                                                                   'for (var r = [], d = u - i; d > 0 ? i <  u : i >  u; i += s) r.push(i); return r})((_lower), (_upper), (_step))'),

                            ni_pattern = anon('(function (i, u, s) {if ((u - i) * s <= 0) return [];' +                // Check for degenerate iteration
                                                                   'for (var r = [], d = u - i; d > 0 ? i <= u : i >= u; i += s) r.push(i); return r})((_lower), (_upper), (_step))'),

                            scope      = anon('(function (o) {_body}).call(this, (S[_o]))'),
                            scoped(t)  = scope.replace({_body: t}),

                            form(p)    = tree.replace(match) -given.match -where [tree = scoped(anon(p))],
                            keys       = form('var ks = []; for (var k in o) Object.prototype.hasOwnProperty.call(o, k) && ks.push(k); return ks'),
                            values     = form('var vs = []; for (var k in o) Object.prototype.hasOwnProperty.call(o, k) && vs.push(o[k]); return vs'),
                            pairs      = form('var ps = []; for (var k in o) Object.prototype.hasOwnProperty.call(o, k) && ps.push([k, o[k]]); return ps'),

                            object     = form('for (var r = {}, i = 0, l = o.length, x; i < l; ++i) x = o[i], r[x[0]] = x[1]; return r')]]})(caterwaul);

// Generated by SDoc 




  caterwaul.js_all = function () {return this.seq(this.words(this.js_literals(this.js())))}})();

// Generated by SDoc 

// Linear algebra library | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Introduction.
// This module provides various functions for doing vector and matrix algebra. It is more oriented towards generating new values than it is towards solving equations. It represents all matrices
// and vectors as arrays that can be manipulated with the sequence macro library. This representation is not particularly fast when used directly, but the accompanying numerical compiler can
// reduce memory allocation to improve performance significantly. All operations in this library are nondestructive.

// Matrices are represented as nested arrays in row-major order. This means that x[1][2] returns the entry in the second row, third column. All matrices have the invariant that they are properly
// rectangular; that is, all row arrays are the same length.

  // Interface.
//   This vector library generalizes to an arbitrary number of coordinates, but the compiled code contains no loops. Instead, you instantiate an N-dimensional copy of the library and it compiles
//   specialized functions. So, for example, the compiled function for componentwise addition in three-dimensional space is vplus(a, b) = [a[0] + b[0], a[1] + b[1], a[2] + b[2]]. Generally you'd
//   combine this with a using[] macro to eliminate duplicate compilation:

  // | reflect(a, normal) = a /-vproj/ normal /-vscale/ -2 /-vplus/ a,
//     using [caterwaul.linear.vector(3, 'v')]

  // If you're using multiple dimensions at once, you can customize the prefix to distinguish the functions:

  // | using [caterwaul.merge({}, caterwaul.linear.vector(3, 'v3'), caterwaul.linear.vector(4, 'v4'))]

caterwaul.js_all()(function ($) {
  $.linear = capture [vector = generator(base_v, composite_v), matrix = generator(base_m, composite_m), scalar_field = scalar_field, complex_field = complex_field],

  where [generator(base, composite)(n, prefix, field) = {} /compiled_base /-$.merge/ composite(compiled_base, f) /-rename/ prefix -where [f             = field || scalar_field,
                                                                                                                                          compiled_base = base(n, f)],
         rename(o, prefix)        = o %k*['#{prefix || ""}#{x}'] -seq,

         scalar_field             = {zero: '0'.qs, one: '1'.qs, '+': '_x + _y'.qs, '-': '_x - _y'.qs, '*': '_x * _y'.qs, '/': '_x / _y'.qs, 'u~': 'Math.sqrt(_x)'.qs},
         complex_field            = {zero:  '{r: 0, i: 0}'.qs, one: '{r: 1, i: 0}'.qs,
                                     '+':  '{r: _x.r + _y.r,                                              i: _x.i + _y.i}'.qs,
                                     '-':  '{r: _x.r - _y.r,                                              i: _x.i - _y.i}'.qs,
                                     '*':  '{r: _x.r * _x.r - _x.i * _y.i,                                i: 2 * _x.i * _y.i}'.qs,
                                     '/':  '{r: (_x.r*_y.r + _x.i*_y.i) / (_y.r*_y.r + _y.i*_y.i),        i: (_x.i*_y.r - _x.r*_y.i) / (_y.r*_y.r + _y.i*_y.i)}'.qs,
                                     'u~': '{r: Math.sqrt((Math.sqrt(_x.r*_x.r + _x.i*_x.i) + _x.r) / 2), i: Math.sqrt((Math.sqrt(_x.r*_x.r + _x.i*_x.i) - _x.r) / 2)}'.qs},

         field_rewrite(e, field)  = e /~pmap/ visit -where [pattern_for(s) = /^\w+$/.test(s) ? $.parse(s) : /^u/.test(s) ? $.parse('#{s /~substr/ 1}_x') : $.parse('_x #{s} _y'),
                                                            patterns       = field /pairs *[[x[0], pattern_for(x[0])]] /object -seq,
                                                            visit(node)    = field /~hasOwnProperty/ node.data ? replace(node, patterns[node.data]) : node,
                                                            replace(n, p)  = template /~replace/ match -where [template = field[n.data], match = p /~match/ n]],

// Vector functions.
// Each function is implemented in terms of its structure. Simple componentwise functions are specified by providing an expression to use for each component, where a wildcard 'i' will be replaced
// by the index of that coordinate. This expression is then used in a reduction, which is some structure that combines components into a single value. For example, this is the reduction for
// 'plus':

// | plus = reduction(3,                   // <- number of dimensions
//                    'a, b'.qs,           // <- formal parameters, quoted as syntax
//                    '[x]'.qs,            // <- result expression
//                    'x, y'.qs,           // <- binary combination of intermediate values
//                    'a[i] + b[i]'.qs)    // <- componentwise combination

// Most simple vector functions can be defined this way. Others, however, are better defined in terms of each other; for instance, the 'proj' and 'orth' functions never access the vectors
// directly since they are defined in terms of the dot product and vector-scalar multiplication. The obvious solution is to first create the reduction functions and then define things like 'proj'
// and 'orth' to close over them; however, this is problematic from a compilation perspective since we would need the closure state to know the dimension of 'proj' and 'orth'. To compensate, the
// syntax tree is stored as an attribute of the compiled function, and the syntax tree contains refs which bind all closure dependencies.

// Note that cross products aren't handled by the vector library; these are considered to be matrix functions, and the determinant formula is computed specifically for a given matrix size rather
// than being explicitly generalized.

  // Defining alternative componentwise semantics.
//   An extra parameter, 'field', lets you redefine algebraic field operations. This can be useful if you want to build vectors or matrices over non-scalar data structures. In particular, if you
//   specify this parameter you'll need to provide replacements for +, -, *, /, and optionally a square root function, which is counterintuitively denoted as a unary one's complement. Your field
//   must also define zero and one. Here's an example for working with complex numbers:

  // | my_field = {zero: '{r: 0, i: 0}'.qs,
//                 one:  '{r: 1, i: 0}'.qs,
//                 '+':  '{r: _x.r + _y.r, i: _x.i + _y.i}'.qs,
//                 '-':  '{r: _x.r - _y.r, i: _x.i - _y.i}'.qs,
//                 '*':  '{r: _x.r * _x.r - _x.i * _y.i, i: 2 * _x.i * _y.i}'.qs,
//                 '/':  '{r: (_x.r*_y.r + _x.i*_y.i) / (_y.r*_y.r + _y.i*_y.i), i: (_x.i*_y.r - _x.r*_y.i) / (_y.r*_y.r + _y.i*_y.i)}'.qs,
//                 'u~': '{r: Math.sqrt((Math.sqrt(_x.r*_x.r + _x.i*_x.i) + _x.r) / 2), i: Math.sqrt((Math.sqrt(_x.r*_x.r + _x.i*_x.i) - _x.r) / 2)}'.qs}

  // These expressions will then replace the real-number field used by default. Note here that the complex conjugate operation has duplicated subexpressions; _y.r*_y.r + _y.i*_y.i is computed
//   twice. This won't be a problem in the compiled function because all of the expressions are subject to common subexpression elimination prior to being compiled. (This is the mechanism used to
//   optimize matrix array access as well.) Because of this optimization, it's very important that any side-effects of each subexpression be idempotent and commutative.

  // You can reuse existing functions as well as defining them on the fly. You should do this using syntax refs:

  // | my_field = {'+': 'f(_x, _y)'.qs.replace({f: new caterwaul.ref(my_function)}), ...}

  // If you want your functions to be optimized, then you should define them with a '.tree' attribute that points to the syntax tree of their return value. This lets optimization stages access
//   their closure state and potentially eliminate the function call altogether.

         base_v(n, field)         = capture [plus  = r(n, 'a, b'.qs, '[x]'.qs, 'x, y'.qs, 'a[i] + b[i]'.qs),  times = r(n, 'a, b'.qs, '[x]'.qs, 'x, y'.qs, 'a[i] * b[i]'.qs),
                                             minus = r(n, 'a, b'.qs, '[x]'.qs, 'x, y'.qs, 'a[i] - b[i]'.qs),  scale = r(n, 'a, b'.qs, '[x]'.qs, 'x, y'.qs, 'a[i] * b'.qs),
                                             dot   = r(n, 'a, b'.qs, 'x'.qs, 'x + y'.qs, 'a[i] * b[i]'.qs),   norm  = r(n, 'a'.qs, '~(x)'.qs, 'x + y'.qs, 'a[i] * a[i]'.qs),

                                             macv  = r(n, 'a, b, c'.qs, '[x]'.qs, '[x, y]'.qs, 'a[i] + b[i] * c[i]'.qs),
                                             macs  = r(n, 'a, b, c'.qs, '[x]'.qs, '[x, y]'.qs, 'a[i] + b * c[i]'.qs)]

                            -where [r(n, formals, wrap, fold, each) = '(function (_formals) {return _e})'.qs /~replace/ {_formals: formals, _e: specialized} /!$.compile
                                                                      -se [it.tree = specialized]
                                                              -where [body        = wrap /~replace/ {x: n[n] *[each /~replace/ {i: '#{x}'}] /[fold /~replace/ {x: x0, y: x}] -seq},
                                                                      specialized = body /-field_rewrite/ field]],

         composite_v(base, field) = capture [unit = ref_compile(base, 'a'.qs,    'scale(a, one / norm(a))'.qs),
                                             proj = ref_compile(base, 'a, b'.qs, 'scale(b, dot(a, b) / dot(b, b))'.qs),
                                             orth = ref_compile(base, 'a, b'.qs, 'minus(a, scale(b, dot(a, b) / dot(b, b)))'.qs)]

                            -where [ref_compile(functions, formals, body) = '(function (_formals) {return _e})'.qs /~replace/ {_formals: formals, _e: new_body} /!$.compile
                                                                            -se [it.tree = new_body]
                                                                    -where [specialized = body /-field_rewrite/ field,
                                                                            new_body    = specialized |~replace| functions %v*[new $.ref(x)] -seq]],

// Matrix functions.
// Most of these are standard textbook functions, though there some of them are peculiar to this data representation. In particular, all matrix coordinates are unrolled; this means that some
// weird optimizations can happen. Vector functions were essentially flat; there was very little repetitive access to sub-arrays. This isn't true of matrices, however. Consider a simple
// coordinate-wise addition function over 2x2 matrices:

// | plus(a, b) = [[a[0][0] + b[0][0], a[0][1] + b[0][1]],
//                 [a[1][0] + b[1][0], a[1][1] + b[1][1]]]

// Each top-level sub-array in a and b is accessed twice (that is, a[0], a[1], b[0], and b[1]), and unless the Javascript runtime is clever enough to prove their invariance, these loads will
// happen twice. Rather than explicitly loading the sub-arrays twice, better is to perform common subexpression elimination and allocate local variables to cache the lookups:

// | plus = function (a, b) {
//     var a0 = a[0], a1 = a[1], b0 = b[0], b1 = b[1];
//     return [[a0[0] + b0[0], a0[1] + b0[1]],
//             [a1[0] + b1[0], a1[1] + b1[1]]];
//   };

// Matrix functions are structured roughly the same way as vector functions from a compilation perspective. It's a bit more complicated here because there are two levels of reduction instead of
// one. Some things are also complexified by conditions on the matrix size; for instance, the determinant only exists for square matrices. (Fortunately, this library only provides functions for
// square matrices.)

// There are some compromises made for performance. In particular, matrix and vector functions are untyped, so it doesn't make sense to compute a cross product in the usual vector way. (That is,
// set the top row of the matrix to contain vectors instead of scalars.) Instead, the cross product is a special form of the determinant; this preserves the untyped representation. In addition to
// things like this, various safety rules are ignored; for instance, there is no size-checking despite the fact that every function operates only on matrices of specific dimensions.

         base_m(n, field)          = capture [plus  = componentwise(n, 'a, b'.qs, 'a[i][j] + b[i][j]'.qs),  scale     = componentwise(n, 'a, b'.qs, 'a[i][j] * b'.qs),
                                              minus = componentwise(n, 'a, b'.qs, 'a[i][j] - b[i][j]'.qs),  transpose = componentwise(n, 'a'.qs, 'a[j][i]'.qs),

                                              times = r3(n, 'a, b'.qs, '[x]'.qs, 'x, y'.qs, '[x]'.qs, 'x, y'.qs, 'x'.qs, 'x + y'.qs, 'a[i][k] * b[k][j]'.qs)]

                             -where [componentwise() = null, r3() = null],

         composite_m(base, field)  = capture [transpose = null]]})(caterwaul);

// Generated by SDoc 

// Terminal library | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Introduction.
// This module provides ANSI terminal rendering of a text-based scene graph. Unlike curses/ncurses, it doesn't provide much in the way of window borders or other UI framing; it just gives you a
// way to manage a layered display of information with various text attributes. Perhaps counterintuitively, it uses a subclass of Caterwaul syntax trees to implement this scene graph data
// structure.

  // Prerequisites.
//   If you plan on using this library for any serious applications, I recommend externally using 'stty -echo -icanon' or similar to enable character-at-a-time input and no explicit echoing. This
//   can't be handled from within Javascript without using C extensions, and that would make the library runtime-specific and potentially non-portable.

caterwaul.js_all()(function ($) {
  $.terminal = capture [

// Low-level rendering methods.
// The terminal library uses a chaining syntax to construct temporary objects that are then serialized into driver strings. For example, suppose you want to render 'hello world' in blue at row
// 10, column 20. You'd do this by constructing a renderer:

// | console.log('%s', caterwaul.terminal.render().at(20, 10).fg(34).text('hello world'));

// You can get some useful constants by 'using' caterwaul.terminal.render:

// | console.log('%s', render().clear(line, forward).fg(blue).text('hello world')),
//   using [caterwaul.terminal],           // for render()
//   using [caterwaul.terminal.render]     // for line, forward, blue, etc

    render = ctor -where [ctor(xs) = this instanceof ctor ? this -se [it.xs = xs] : new ctor(xs || [])]
             -se- it.prototype /-$.merge/ capture [add(x)   = new this.constructor(this.xs + [x] -seq),             toString()       = this.xs.join(''),

                                                   text(x)  = this.add(x),                                          clear(what, how) = this.add('\033[#{how}#{what}'),

                                                   at(x, y) = this.add(y ? '\033[#{Math.round(y)};#{Math.round(x)}H' : '\033[#{Math.round(x)}G'),

                                                   up(x)    = this.add('\033[#{Math.abs(x)}#{x < 0 ? "F" : "E"}'),  reset()     = this.add('\033[0;0m'),
                                                   down(x)  = this.up(-x),                                          bg(n, mode) = n != null ? this.add('\033[#{mode || 0};#{40 + n}m') : this,
                                                                                                                    fg(n, mode) = n != null ? this.add('\033[#{mode || 0};#{30 + n}m') : this]

             -se- it           /-$.merge/ capture [black  =  0,   red    =  1,   green   = 2,  yellow    = 3,  blue  = 4,  purple   = 5,  cyan = 6,  white = 7,
                                                   normal =  0,   bold   =  1,   italic  = 3,  underline = 4,  blink = 5,  negative = 7,
                                                   line   = 'K',  screen = 'J',  forward = 0,  backward  = 1,  all   = 2],

  // Size detection.
//   There's a proper way to get the terminal size, but we don't necessarily have access to it from inside Javascript. Fortunately, we can use a hack to do the same thing. The hack in this case
//   is to try to move the cursor way out into the middle of nowhere and see where it ends up. It has to stop at the bottom-right corner of the terminal, and its position tells us the terminal's
//   size.

  // Doing this requires a dialog between output and input. This is abstracted here by several continuations: stdout_cc should be a function that takes a string and sends it to the terminal. This
//   is used to move the cursor. stdin_data should be some data from the terminal. If it is relevant, then size_cc will be invoked with a 2-vector (stored as an array) indicating the number of
//   rows and columns available. Any irrelevant data is sent to stdin_cc.

    detect_size(stdout_cc, size_cc, stdin_cc, stdout_cc('\033[65535;65535H\033[6n'))(stdin_data) = /^(.*)\033\[(\d+);(\d+)R(.*)$/.exec(stdin_data)
                                                                                                   -re [it ? [stdin_cc('#{it[1]}#{it[4]}'), size_cc([+it[3], +it[2]])] :
                                                                                                             [stdin_cc(stdin_data), null]],

// Overlays.
// Each overlay is a region that somehow transforms the content underneath it. The most common transformation is one that renders characters specific to an overlay while replacing all others with
// spaces. An overlay is defined as a relative position, size, and a content generation function. The content generation function takes a block of text (an array of array of characters) that the
// overlay is covering, and returns a new block of text for the overlay to display. Each 'character' in the block of text may be preceded and followed by an escape sequence that modifies it.
// Redundant escape sequences are optimized away at render-time.

// You probably won't use overlays directly. Rather, you'll most likely use a text_overlay, which presents a simpler interface. You can set its text dynamically and it will truncate it to fit
// within its dimensions. It also provides trivial readline-style editing, though not as nice as readline.

// Because a scene graph is a tree-like structure, it is implemented as (you guessed it) a subclass of Caterwaul syntax trees. This actually has some significant benefits, one of them being the
// ease of establishing a trivial isomorphism between syntax trees and graphical elements.

    overlay_constructor(f)(xs = arguments) = this -se [it._visible = true, it._position = [0, 0], it.length = 0] -se- f.apply(it, xs),
    overlay_subclass(f, xs = arguments)    = $.syntax_subclass(f /!$.terminal.overlay_constructor, $.terminal.overlay_prototype, (+xs).slice(1) /[{}][x0 /-$.merge/ x] -seq),

    overlay_prototype = capture [bind(name, f)    = this -se- (it['_#{name}_listeners'] = it['_#{name}_listeners'] || []).push(f),
                                 trigger(name, x) = this -se [it['_#{name}_listeners'] && it['_#{name}_listeners'] *!f[f.call(this, x)] -seq],

                                 handle_input(s)  = this /-parse_input/ s,

                                 contains(x, y)   = x instanceof Array ? this.contains(x[0], x[1]) :
                                                                         x >= this._position[0] && x <= this._position[0] + this._dimensions[0] &&
                                                                         y >= this._position[1] && y <= this._position[1] + this._dimensions[1],

                                 handle(event)    = event.position(this.cursor_position()) /unless [event.position()]
                                                    -se- this.trigger('#{event.name}_capture', event) -se- event /!this.propagate -se- this.trigger(event.name, event),

                                 propagate(event) = +this %[x /~contains/ translated.position()] *![x /~handle/ translated] -seq
                                                    -se- event.destination_is(this) /unless [it.length] -where [translated = event /~visit/ this],

  // Hierarchical rendering.
//   An overlay's render() method generates the escape codes to reload that overlay as well as its children. There are a few caveats, though. One is that this method is context-sensitive;
//   overlays don't have parent links, so it's not possible for a single overlay to know where it is located on the screen without some extra information. The context object contains both the
//   parent overlay and that parent's absolute position.

  // The other caveat is that this method doesn't actually do anything until you provide a content() function. content() is invoked anytime render() is called, and it should return a string to
//   redraw the overlay's contents. It also receives a copy of the context object. Note that content() is expected to deal with any existing stuff that the last render left in the terminal.

                                 render_root()    = {position: [1, 1], parent: null} /!this.render,
                                 render(context)  = this._visible ? this.content(context) + +this *[{parent: this, position: p} /!x.render] /seq /re [it.join('')]
                                                                    -where [p = this._position /-v2plus/ context.position] :
                                                                    '',

                                 // Tree serialization for debugging; this has nothing to do with actual rendering. Caterwaul provides the toString() method automatically.
                                 serialize(xs)    = xs -se [it.push('[overlay @[#{this._position.join(", ")}]: '), +this *![x /~serialize/ it] -seq, it.push(']')]]

             /events   ('click doubleclick mousedown mouseup key control'.qw *~![[x, '#{x}_capture']] -seq)
    /-$.merge/accessors('visible position dimensions parent cursor_position'.qw)

  // IO dialog.
//   The terminal sometimes writes events to standard input. Ultimately all keystroke and mouse events come in this way, and it's up to the terminal library to decode the escape sequences. These
//   are the incoming events that it understands (minus whitespace, inserted here for readability):

  // | \033[ n ; m R                 <- cursor position report
//     \033[ A-D                     <- up, down, right, left arrows, respectively
//     \033[ M bxy                   <- mouse press event, where x and y are space-encoded numbers and b is a bitfield: 3=release, 2=button3, 1=button2, 0=button1
//     \033[ <character>             <- alt + something, though this is ambiguous

  // Everything else is either lower ASCII or a Unicode character, which is considered to be regular input.

                -where [parse_input(overlay, s)  = overlay -se- s.split('\033[') *![overlay /-normal_keystrokes/ parse_escape(overlay, x)] -seq,
                        normal_keystrokes(o, s)  = s.split('') *![x.charCodeAt(0) < 32 ? o /-control_event/ x : o /-key_event/ x] -seq,
                        parse_escape(o, s)       = /^[ABCD]/.test(s)               ? overlay /-arrow_event/     s.charAt(0)    -re- s.substr(1) :
                                                   /^M.../.test(s)                 ? overlay /-mouse_event/     s.substr(1, 3) -re- s.substr(4) :

                                                   /^(\d+);(\d+)R/.exec(s) -re [it ? overlay /+it[1] /-cursor_position/ +it[2]      -re- s.substr(it[0].length) :
                                                                                     overlay         /-escaped_key/     s.charAt(0) -re- s.substr(1)],

                        mouse_event(o, s)        = s.charCodeAt(0) & 0x8 ? o /~handle/ mouse_event_for(s, 'mouseup') : o /~handle/ mouse_event_for(s, 'mousedown'),
                        mouse_event_for(s, name) = $.terminal.event[name](s.charCodeAt(0) & 0x7, [s.charCodeAt(1) - 32, s.charCodeAt(2) - 32], s.charCodeAt(0) >> 4),

                        arrow_event(o, s)        = o /~handle/ $.terminal.event.arrow(s),
                        control_event(o, s)      = o /~handle/ $.terminal.event.control(s),
                        key_event(o, s)          = o /~handle/ $.terminal.event.key(s),
                        escaped_key(o, s)        = o /~handle/ $.terminal.event.escaped(s),

                        cursor_position(o, x, y) = o /~cursor_position/ [x, y]],

  // Common overlays.
//   These are designed for common use cases. linear_text_overlay displays a single line of text and is the simplest overlay to use. It always masks any content below it.

    linear_text_overlay(merged = arguments /[{}][x0 /-$.merge/ x] -seq) = ctor /accessors('text fg bg'.qw) /methods /-$.terminal.overlay_subclass/merged
                                                                  -where [ctor(text, options) = text instanceof this.constructor ?
                                                                                                  this -se [it._text = text._text, it._fg = text._fg, it._bg = text._bg] :
                                                                                                  this -se [it._text = text] -se [it._fg = options.fg, it._bg = options.bg, when.options],

                                                                          methods             = capture [content(context) = this.renderer_for(context).text(this._text),
                                                                                                         renderer_for(c)  = $.terminal.render().at(p[0], p[1]).fg(this._fg).bg(this._bg)
                                                                                                                    -where [p = this._position /-v2plus/ c.position]]],

// Events.
// This library understands mouse escape sequences and can translate them into events that get propagated through the scene graph. The interface is similar to jQuery's DOM event interface: events
// are captured and then bubbled. Available events are:

// | click:        fired when the user does a mouse-press followed by a mouse-release
//   doubleclick:  fired when the user does two clicks in quick succession (400ms timeout) and in roughly the same location (3x2 character margin)
//   mousedown:    fired when the user presses a mouse button
//   mouseup:      fired when the user releases a mouse button

// Key events are also reported and are propagated to whichever overlay contains the cursor. These are partitioned into 'normal' and 'control' characters:

// | key:          fired when the user types a key that isn't a control character (basically a printable character; see below)
//   control:      fired when the user types a control character, such as the arrow keys, Ctrl+something, Alt+something, etc.

// Events come with some data that may be helpful:

// | position()    the position of the event relative to the element that is receiving it. For keystrokes, the cursor position before the keystroke is used.
//   target()      the capture destination of the event if it has been fully captured, otherwise null
//   name()        the name of the event, for instance 'click', 'mousedown', etc
//   key()         the key that was pressed; null for non-key events
//   arrow()       the arrow that was pressed, expressed as a single character 'n', 's', 'e', 'w'; null for non-arrow events
//   code()        the ASCII code for a control character event; null for non-control events
//   button()      a bitmask of button indexes; lowest bit is 1, next is 2, next is 3
//   modifiers()   a bitmask of modifier keys such as control, shift, and alt -- available only for mouse events. shift = bit 0, meta = bit 1, control = bit 2

    event = given [data, target] [this instanceof $.terminal.event ? this -se [it._data = data, it._target = target || null, it._path = []] : new $.terminal.event(data, target)]
            -se- it.prototype           /capture [stop() = this._stopped = this,  target() = this._target,  path() = this._path,

                                                  destination_is(o) = this._path *![x.target(o)] -seq -re- this,
                                                  visit(overlay)    = new this.constructor({} /data /-$.merge/{position: this.position() /-v2minus/ overlay.position()}, target)
                                                                      -se- it.path().push(overlay)]

                              /-$.merge/ accessors('position name code button arrow key modifiers'.qw)

            -se- it           /-$.merge/ capture [mousedown(button, position, keys)   = $.terminal.event({name: 'mousedown',   button: button, position: position, modifiers: keys}),
                                                  mouseup(button, position, keys)     = $.terminal.event({name: 'mouseup',     button: button, position: position, modifiers: keys}),
                                                  click(button, position, keys)       = $.terminal.event({name: 'click',       button: button, position: position, modifiers: keys}),
                                                  doubleclick(button, position, keys) = $.terminal.event({name: 'doubleclick', button: button, position: position, modifiers: keys}),

                                                  key(character)                      = $.terminal.event({name: 'key', key: character}),
                                                  escaped(character)                  = $.terminal.event({name: 'key', key: character, modifiers: 0x2}),        // meta modifier

                                                  arrow(code)                         = $.terminal.event({name: 'control', arrow: arrow_codes[code]}),
                                                  control(character)                  = $.terminal.event({name: 'control', code:  code}),

                                                  shift = 1, meta = 2, ctrl = 4,  button1 = 1, button2 = 2, button3 = 4]

    -where [arrow_codes = {A: 'n', B: 's', C: 'e', D: 'w'}]],

  where [pluralize(f)(xs)  = xs *[[x, f(x)]] -object -seq,
         accessor(name)(x) = arguments.length ? this -se [it['_#{name}'] = x] : this['_#{name}'],  accessors = pluralize(accessor),
         event(name)(x)    = x instanceof Function ? this.bind(name, x) : this.trigger(name, x),   events    = pluralize(event)],

  using [caterwaul.linear.vector(2, 'v2')]})(caterwaul);

// Generated by SDoc 


// Generated by SDoc 






// Size monitor | Spencer Tipping
// Licensed under the terms of the MIT source code license

// Introduction.
// This app continuously detects the terminal window size and displays it in the upper left corner.

caterwaul.js_all()(function ($) {
  process.stdin /se [it.on('data', filter), it.setEncoding('utf8'), it.resume()]
  -se- poll_for_size /-setInterval/ 125

  -where [poll_for_size() = stdin_cc = detect_size(console.log, size_cc, "console.log(render().fg(green).text(_))".qf),
          filter(data)    = stdin_cc && stdin_cc(data),
          size_cc(wh)     = console.log('%s', screen /-render().clear/ all + new text_overlay('<#{wh[0]} x #{wh[1]}>').fg(yellow).render_root()),

          text_overlay    = linear_text_overlay()]

  -using [caterwaul.terminal.render]
  -using [caterwaul.terminal]
  -using [caterwaul.linear.vector(2, 'v2')]})(caterwaul);

// Generated by SDoc 


// Generated by SDoc 




// Unit tests.
// These are loaded automatically each time you boot up the REPL. This makes it easy to see when something has gone wrong.



// Console-based testing.
// This color-codes the test output depending on error status.

var t = function () {try       {console.log(Array.prototype.join.call(arguments, ', ') + ' \033[1;32m' + test_case.apply(this, arguments) + '\033[0;0m')}
                     catch (e) {console.log(Array.prototype.join.call(arguments, ', ') + ' \033[1;31m' + e                                + '\033[0;0m')}};

// Generated by SDoc 





// Unit tests.
// These are quick, visible assertions to make sure that the setup works properly. The test_case function is called automatically by t(), which is customized to work on whatever platform you're
// running under (e.g. node.js or a browser).

test_case = function (x) {return caterwaul.parse(x).structure()};

// Generated by SDoc 




// Generated by SDoc 
