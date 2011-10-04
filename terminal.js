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

                                                   up(x)    = this.add('\033[#{Math.abs(x)}#{x < 0 ? "F" : "E"}'),  reset()          = this.add('\033[0;0m'),
                                                   down(x)  = this.up(-x),                                          bg(n, mode)      = this.add('\033[#{mode || 0};#{40 + n}m'),
                                                   at(x, y) = this.add(y ? '\033[#{y};#{x}H' : '\033[#{x}G'),       fg(n, mode)      = this.add('\033[#{mode || 0};#{30 + n}m')]

             -se- it           /-$.merge/ capture [black  =  0,   red    =  1,   green   = 2,  yellow    = 3,  blue  = 4,  purple   = 5,  cyan = 6,  white = 7,
                                                   normal =  0,   bold   =  1,   italic  = 3,  underline = 4,  blink = 5,  negative = 7,
                                                   line   = 'K',  screen = 'J',  forward = 0,  backward  = 1,  all   = 2],

// Overlays.
// Each overlay is a region that somehow transforms the content underneath it. The most common transformation is one that renders characters specific to an overlay while replacing all others with
// spaces. An overlay is defined as a relative position, size, and a content generation function. The content generation function takes a block of text (an array of array of characters) that the
// overlay is covering, and returns a new block of text for the overlay to display. Each 'character' in the block of text may be preceded and followed by an escape sequence that modifies it.
// Redundant escape sequences are optimized away at render-time.

// You probably won't use overlays directly. Rather, you'll most likely use a text_overlay, which presents a simpler interface. You can set its text dynamically and it will truncate it to fit
// within its dimensions. It also provides trivial readline-style editing, though not as nice as readline.

// Because a scene graph is a tree-like structure, it is implemented as (you guessed it) a subclass of Caterwaul syntax trees. This actually has some significant benefits, one of them being the
// ease of establishing a trivial isomorphism between syntax trees and graphical elements.

    overlay_constructor(f, r = result)(x) = x instanceof r ? this -se- f.apply(it, arguments) : x.clone(),
    overlay_subclass(f, xs = arguments)   = $.subclass_syntax(f /!overlay_constructor, overlay_prototype, (+xs).slice(1) /[x0 /-$.merge/ x] -seq),

    overlay_prototype = capture [bind(name, f)    = this -se- (it['_#{name}_listeners'] = it['_#{name}_listeners'] || []).push(f),
                                 trigger(name, x) = this -se [it['_#{name}_listeners'] && it['_#{name}_listeners'] *!f[f.call(this, x)] -seq],

                                 input(s)         = parse_input(this, s),

                                 contains(x, y)   = x >= this._position[0] && x <= this._position[0] + this._dimensions[0] &&
                                                    y >= this._position[1] && y <= this._position[1] + this._dimensions[1]]

             /events   ('click doubleclick mousedown mouseup key control'.qw)
    /-$.merge/accessors('visible position dimensions parent'.qw)

                -where [pluralize(f)(xs)  = xs *[[x, f(x)]] -object -seq,
                        accessor(name)(x) = arguments.length ? this -se [it['_#{name}'] = x] : this['_#{name}'],  accessors = pluralize(accessor),
                        event(name)(x)    = x instanceof Function ? this.bind(name, x) : this.trigger(name, x),   events    = pluralize(event),

// IO dialog.
// The terminal sometimes writes events to standard input. Ultimately all keystroke and mouse events come in this way, and it's up to the terminal library to decode the escape sequences. These
// are the incoming events that it understands (minus whitespace, inserted here for readability):

// | \033[ n ; m R                 <- cursor position report
//   \033[ A-D                     <- up, down, right, left arrows, respectively
//   \033[ M bxy                   <- mouse press event, where x and y are space-encoded numbers and b is a bitfield: 3=release, 2=button3, 1=button2, 0=button1
//   \033[ <character>             <- alt + something, though this is ambiguous

// Everything else is either lower ASCII or a Unicode character, which is considered to be regular input.

                        parse_input(overlay, s) = overlay -se- s.split('\033[') *![overlay /-normal_keystrokes/ parse_escape(overlay, x)] -seq,
                        normal_keystrokes(o, s) = s.split('') *![o /~key/ x] -seq,
                        parse_escape(o, s)      = /^[ABCD]/.test(s) ? overlay              /~control/         arrows[s.charAt(0)] -re- s.substr(1) :
                                                  /^M.../.test(s)   ? overlay              /-mouse_event/     s.substr(1, 3)      -re- s.substr(4) :
                                                  /^.;.R/.test(s)   ? overlay /s.charAt(0) /-cursor_position/ s.charAt(2)         -re- s.substr(4) :
                                                                      overlay              /-escaped_key/     s.charAt(0)         -re- s.substr(1),

                        mouse_event(o, s)       = 

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

]})(caterwaul);

// Generated by SDoc 
