#!/usr/bin/env bash
set -Eeuo pipefail
cd /var/www/blogging
[[ -d .git ]] || { echo "/var/www/blogging is not a Git checkout." >&2; exit 1; }
chmod +x configure-admin.sh
./configure-admin.sh /var/www/blogging
printf '\nConfiguration committed. Pushing to existing origin...\n'
git push
printf '\nDONE. Open https://forumdevfromhell.github.io/admin.html\n'
