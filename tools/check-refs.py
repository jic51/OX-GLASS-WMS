#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Find functions the app calls but never defines.

Written after a helper (_escAttr) was deleted along with the feature whose code
it happened to sit inside. `node --check` passed — a missing function is not a
syntax error — and the app loaded, rendered half a screen, threw, and left the
splash up forever. Syntax checking cannot catch that; this can.

Deliberately narrow in two ways.

It only reports names this codebase owns — helpers with a leading underscore.
Browser and Google APIs are not its business, and a whitelist of those would rot.

And it errs toward silence. Definitions are collected from the whole file
INCLUDING comments, so a name mentioned in prose counts as defined; call sites
are collected only from the code half of each line. Both choices trade a missed
warning for never crying wolf, because a checker that reports things that are
fine is a checker nobody runs.

    python3 tools/check-refs.py                    # Index_v3_fixed.html
    python3 tools/check-refs.py FILE [FILE ...]
"""
import io, re, sys, os

BUILTINS = set('''
if for while switch catch return typeof function new delete void in of do else try
Object Array String Number Boolean Math JSON Date RegExp Error Promise Map Set
parseInt parseFloat isNaN isFinite encodeURIComponent decodeURIComponent setTimeout
setInterval clearTimeout clearInterval alert confirm prompt fetch require console
'''.split())

BLOCK_COMMENT = re.compile(r'/\*.*?\*/', re.S)


def script_bodies(path):
    src = io.open(path, encoding='utf-8').read()
    if path.endswith('.gs'):
        return [src]
    return re.findall(r'<script(?![^>]*src=)[^>]*>(.*?)</script>', src, re.S)


def code_only(body):
    """The code half of each line. Block comments go first, then everything
    after a `//` on each remaining line.

    A `//` inside a string (an https:// URL, say) truncates that line early. The
    cost of that is a definition or a call going unseen — a missed warning, never
    a false one — which is the direction this tool is meant to fail in."""
    body = BLOCK_COMMENT.sub(' ', body)
    return '\n'.join(line.split('//')[0] for line in body.split('\n'))


def check(path):
    full = '\n'.join(script_bodies(path))
    code = code_only(full)

    # Definitions from the WHOLE file, comments included: over-counting here can
    # only silence a warning, and silence is the safe direction.
    defined = set(re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)', full))
    defined |= set(re.findall(r'\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)', full))
    defined |= set(re.findall(r'([A-Za-z_$][\w$]*)\s*:\s*function', full))
    # Function parameters — callables within their own scope.
    for params in re.findall(r'function[^(]*\(([^)]*)\)', full):
        for p in params.split(','):
            p = p.strip()
            if re.match(r'^[A-Za-z_$][\w$]*$', p):
                defined.add(p)

    # Call sites from the code only.
    called = set(m.group(1) for m in re.finditer(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(', code))

    missing = sorted(n for n in called
                     if n.startswith('_') and n not in defined and n not in BUILTINS)

    name = os.path.basename(path)
    if missing:
        print('%s: %d call(s) to an app helper that is not defined anywhere' % (name, len(missing)))
        for n in missing:
            print('   %s()' % n)
        return 1
    print('%s: ok' % name)
    return 0


if __name__ == '__main__':
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    targets = sys.argv[1:] or ['Index_v3_fixed.html']
    sys.exit(max(check(t if os.path.isabs(t) else os.path.join(here, t)) for t in targets))
