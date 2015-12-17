#!/bin/bash

set -xeo pipefail

cd $SRCDIR && npm install && node_modules/.bin/bower install && node_modules/.bin/gulp build --env=prod
mkdir -p $CANDIR/var/www
cp -a $SRCDIR/.prod_srv/* $CANDIR/var/www
mkdir -p $CANDIR/etc/nginx
cp -aR $SRCDIR/dev/nginx/* $CANDIR/etc/nginx
