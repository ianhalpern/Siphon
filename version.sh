#!/bin/bash

echo $( L=`bzr tags | egrep ^v[0-9] | tail -n 1 | sed s/v//g` && echo `echo $L | sed 's/ .*//g'`.$(expr `bzr revno` - `echo $L | sed 's/.* //g'`) )
