#!/bin/bash
# Dev server wrapper — keeps Next.js running
cd /home/z/my-project
exec node /home/z/my-project/node_modules/.bin/next dev -p 3000 -H 0.0.0.0
