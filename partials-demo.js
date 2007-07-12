/* Copyright 2007 by Oliver Steele.  This work is licensed under the
 * MIT license, and the Creative Commons Attribution-Noncommercial-Share
 * Alike 3.0 License. http://creativecommons.org/licenses/by-nc-sa/3.0/
 */

var info = window.console && console.info || function(){};

// Examples
function examples() {
    // create an unspecialized function that just lists its (four) arguments
    function list(a,b,c,d) {return [a,b,c,d]};

    // specialize the first and third parameters
    var f2 = list.partial(1,_,2,_);
    trace('f2 3 ->', f2(3, 4));

    // specialize the first two parameters (same as currying)
    var f3 = list.partial(1,2,_,_);
    trace('f3 4, 5 -> ', f3(4,5));
    
    // if not all the parameters are supplied, the result is a function...
    trace(f2(4));
    // ...which can be applied until the function is saturated.
    trace('f2 4, 5 ->', f2(3)(4));
    trace(f3(_,3)(4));
    trace(f3(3)(4));
    trace(list.partial(_,_,_,1)(2,_,3)(4));

    // create some specialized versions of String replace
    var replaceVowels = "".replace.partial(/[aeiou]/g, _);
    var replaceWithCoronalFricatives = "".replace.partial(_, 'th');
    // have to invoke methods with call() (could use bind() and then call normally)
    trace(replaceVowels.call("change my vowels to underscores", '_'));
    trace(replaceWithCoronalFricatives.call("substitute my esses with tee-aitches", /s/g));

    // use right curry to create 'halve' and 'double' functions out of divide
    function divide(a, b) {return a/b}
    var halve = divide.rcurry(2);
    var double = divide.rcurry(1/2);
    trace('halve 10', halve(10));
    trace('double 10', double(10));
    
    // curries are like Haskell sections
    // (10 /) 2
    trace(divide.curry(10)(2));
    // (/ 2) 10
    trace(divide.rcurry(2)(10));
    // while partials are like math function syntax
    // (10 / _) 2
    trace(divide.partial(10, _)(2));
    // (_ / 2) 10
    trace(divide.partial(_, 2)(10));
    
    // ncurry and rncurry wait until they're fully saturated before
    // applying the function.  [r]curry can't because it doesn't
    // know the polyadicity of the underlying function.
    trace(list.curry(1,2)(3));
    trace(list.ncurry(4,1,2)(3));
    trace(list.ncurry(4,1,2)(3)(4));
    trace(list.ncurry(4,1,2)(3,4));
    trace(list.rncurry(4,1,2)(3));
    trace(list.rncurry(4,1,2)(3,4));
    
    // Use with Prototype to define an 'onclick' that abbreviates
    // Event.observe(_, 'click', ...)
    Event.observe('e1', 'click', function(){alert('1')});
    var onclick = Event.observe.bind(Event).partial(_, 'click');
    onclick('e2', function(){alert('2')});
    onclick('e3', alert.bind(null).only('3'));
    
    // pluck and reverse
    trace(pluck('length')("a string"));
    trace(invoke('reverse')([1,2,3,4]));
    
    // compose() and sequence() compose sequences of functions
    // backwards and forwards, respectively
    function prepender(prefix) {return ''.concat.bind(prefix)}
    trace(prepender('im')('possible'));
    trace(compose(prepender('hemi'), prepender('demi'))('quaver'));
    trace(sequence(prepender('hemi'), prepender('demi'))('quaver'));
    // this uses map() from Prototype
    trace(compose.apply(null, ['hemi', 'demi', 'semi'].map(prepender))('quaver'));
}

Event.observe(window, 'load', initialize);

function initialize() {
    new Ajax.Request(
        $('output').innerHTML,
        {method: 'GET', onSuccess: compose(displayTestResults, pluck('responseText'))});
    new Ajax.Request(
        $('docs').innerHTML,
        {method: 'GET', onSuccess: compose(displayDocs, pluck('responseText'))});
}

function unindent(lines) {
    var min = lines.grep(/\S/).map(function(line) {
        return line.match(/^\s*/)[0].length; 
    }).min();
    return lines.map(function(line) {
        return line.slice(min);
    });
}

function extractLines(string) {
    var lines = string.split('\n');
    var start = 1 + lines.indexOf(lines.grep(/function examples/)[0]);
    var segment = lines.slice(start);
    var end = start + segment.indexOf(segment.grep(/^\}/)[0]);
    return unindent(lines.slice(start, end)).map(function(line) {
        return line || ' ';
    }).join('\n');
}

function runExamples(examples) {
    var saved = window.trace;
    var results = [];
    try {
        trace = function() {
            var args = $A(arguments).map(function(x) {
                switch (typeof(x)) {
                case 'function': return 'function';
                case 'string': return '"' + x + '"';
                default: return x;
                }
            });
            results.push(args.join(' '));
        }
        examples();
    } catch (e) {
        console.error(e);
    } finally {
        trace = saved;
    }
    return results;
}

function displayTestResults(string) {
    var programLines = extractLines(string).escapeHTML().split('trace(');
    var outputs = runExamples(examples);
    var lines = [programLines.shift()];
    programLines.each(function(segment, ix) {
        var output = outputs[ix].escapeHTML();
        var m = segment.match(/'(.*)', /);
        if (m && '"' + m[1] + '"' == output.slice(0, m[1].length+2)) {
            output = output.slice(m[1].length+2);
            segment = segment.slice(m[0].length);
        }
        var m = segment.indexOf(');');
        lines.push(segment.slice(0, m));
        lines.push(';\n <span class="output">&rarr; ');
        lines.push(output.strip());
        lines.push('</span>');
        lines.push(segment.slice(m+2));
    });
    var html = lines.join('').replace(/(\/\/.*)/g, '<span class="comment">$1</span>');
    $('output').innerHTML = html;
    done('examples');
}

function findCommentSpans(lines) {
    var records = [];
    var rec = null;
    lines.each(function(line) {
        var match = line.match(/^\/\/\s*(.*)/);
        if (match) {
            line = match[1];
            rec || records.push(rec = {lines: [], toHTML: formatComment});
            if (match = line.match(/\s*::\s*(.*)/))
                rec.signature = '<div class="signature"><span class="label">Signature:</span> '+match[1].escapeHTML()+'</div>';
            else {
                line = line.escapeHTML().replace(/\+([\w()_]+)\+/g, '<var>$1</var>').replace(/\*(\w+)\*/g, '<em>$1</em>');
                rec.lines.push(line);
            }
        } else if (rec) {
            match = line.match(/^((?:\w+\.)*\w+)\s*=\s*function\s*\((.*?)\)/);
            rec.target = rec.args = null;
            if (match) {
                rec.fname = match[1];
                rec.args = match[2];
            } else if ((match = line.match(/^function\s+(\w+)\s*\((.*?)\)/))) {
                rec.fname = match[1];
                rec.args = match[2];
            } else if ((match = line.match(/^var\s+(\w+)\s+=/))) {
                rec.fname = match[1];
            } else {
                info('no match', line);
                records.pop();
                return;
            }
            var match = rec.fname.match(/(.*\.)(\w+)/);
            if (match) {
                rec.target = match[1];
                rec.fname = match[2];
            }
            rec.args = rec.args && rec.args.replace(/\/\*/g, '').replace(/\*\//g, '');
            rec = null;
        }
    });
    return records;
}

function formatComment() {
    var spans = [];
    var target = '';
    var fname = this.fn;
    this.target && spans.push('<span class="target">' + this.target + '</span>');
    spans.push('<span class="fname">' + this.fname + '</span>');
    this.args != null && spans.push('(<var>' + this.args + '</var>)');
    this.signature && spans.push(this.signature);
    spans = spans.concat(['<div class="description">',this.lines.join('<br/>'), '</div>', '<br/>']);
    return spans.join('');
}

function displayDocs(string) {
    try {
        recs = findCommentSpans(string.split('\n'));
        var lines = [];
        recs.each(function(rec) {
            lines.push(rec.toHTML());
        });
       $('docs').innerHTML = lines.join('\n');
    } catch (e) {
        console.error(e);
    }
    done('docs');
}

function done(name) {
    var me = arguments.callee;
    me[name] = true;
    if (me.docs && me.examples)
        $('noscript').hide();
}