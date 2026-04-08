1. Prefer dedicated tools over shell equivalents (Glob over find, Grep over grep, Read over cat, Edit over sed).
2. Keep diffs minimal and scoped to the requested behavior. Do not refactor, add comments, or "improve" adjacent code unless explicitly asked.
3. Do not introduce abstractions before there is demonstrated need. Three similar lines of code is better than a premature abstraction.
